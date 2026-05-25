const router = require('express').Router();
const { requireAuth, requireRol } = require('../middleware/auth');
const { readDB, writeDB, actualizarEstados, calcularProxima, hoy } = require('../utils/db');

// Listar equipos (cliente solo ve los de su empresa)
router.get('/', requireAuth, (req, res) => {
  const db = readDB(); actualizarEstados(db); writeDB(db);
  const { rol, empresa } = req.session.usuario;
  const ord = { vencido:0, proximo:1, al_dia:2, sin_fecha:3 };
  let list = rol === 'cliente' ? db.equipos.filter(e => e.empresa === empresa) : db.equipos;
  res.json(list.sort((a,b) => (ord[a.estado]??9)-(ord[b.estado]??9)));
});

// Empresas únicas para datalist
router.get('/empresas', requireAuth, (req, res) => {
  const db = readDB();
  res.json([...new Set(db.equipos.map(e => e.empresa).filter(Boolean))].sort());
});

// Detalle de equipo
router.get('/:id', requireAuth, (req, res) => {
  const db = readDB();
  const { rol, empresa } = req.session.usuario;
  const eq = db.equipos.find(e => e.id === parseInt(req.params.id));
  if (!eq) return res.status(404).json({ error: 'Equipo no encontrado.' });
  if (rol === 'cliente' && eq.empresa !== empresa) return res.status(403).json({ error: 'Sin acceso.' });
  const mants   = db.mantenimientos.filter(m => m.equipo_id === eq.id).sort((a,b) => b.fecha.localeCompare(a.fecha));
  const tickets = db.tickets.filter(t => t.equipo_id === eq.id).sort((a,b) => b.fecha_creacion.localeCompare(a.fecha_creacion));
  res.json({ equipo: eq, mantenimientos: mants, tickets });
});

// Crear equipo
router.post('/', requireRol('admin','usuario'), (req, res) => {
  const { codigo, nombre, tipo, area, marca, modelo, num_serie, frecuencia_meses, ultimo_mantenimiento, empresa } = req.body;
  if (!codigo || !nombre || !tipo || !area || !frecuencia_meses) return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  const db = readDB();
  if (db.equipos.find(e => e.codigo === codigo)) return res.status(400).json({ error: 'Código ya existe.' });
  const nuevo = {
    id: db.nextIds.equipo++, codigo, nombre, tipo, area,
    marca: marca||null, modelo: modelo||null, num_serie: num_serie||null,
    frecuencia_meses: parseInt(frecuencia_meses),
    ultimo_mantenimiento: ultimo_mantenimiento||null,
    proximo_mantenimiento: calcularProxima(ultimo_mantenimiento, frecuencia_meses),
    empresa: empresa||'Sin asignar', estado: 'al_dia', fecha_registro: hoy()
  };
  actualizarEstados({ equipos:[nuevo] });
  db.equipos.push(nuevo); writeDB(db);
  res.status(201).json(nuevo);
});

// Importar desde CSV
router.post('/importar', requireRol('admin','usuario'), (req, res) => {
  const { equipos } = req.body;
  if (!Array.isArray(equipos) || !equipos.length) return res.status(400).json({ error: 'Sin datos.' });
  const db = readDB(); const errores = [], importados = [];
  for (const [i, row] of equipos.entries()) {
    if (!row.codigo || !row.nombre || !row.tipo || !row.area || !row.frecuencia_meses) { errores.push(`Fila ${i+2}: faltan campos`); continue; }
    if (db.equipos.find(e => e.codigo === row.codigo)) { errores.push(`Fila ${i+2}: código "${row.codigo}" ya existe`); continue; }
    const nuevo = {
      id: db.nextIds.equipo++, codigo: row.codigo, nombre: row.nombre, tipo: row.tipo, area: row.area,
      marca: row.marca||null, modelo: row.modelo||null, num_serie: row.num_serie||null,
      frecuencia_meses: parseInt(row.frecuencia_meses),
      ultimo_mantenimiento: row.ultimo_mantenimiento||null,
      proximo_mantenimiento: calcularProxima(row.ultimo_mantenimiento, row.frecuencia_meses),
      empresa: row.empresa||'Sin asignar', estado: 'al_dia', fecha_registro: hoy()
    };
    actualizarEstados({ equipos:[nuevo] });
    db.equipos.push(nuevo); importados.push(nuevo);
  }
  writeDB(db); res.json({ importados: importados.length, errores });
});

// Eliminar equipo (solo admin)
router.delete('/:id', requireRol('admin'), (req, res) => {
  const db = readDB(); const id = parseInt(req.params.id);
  db.equipos = db.equipos.filter(e => e.id !== id);
  db.mantenimientos = db.mantenimientos.filter(m => m.equipo_id !== id);
  db.tickets = db.tickets.filter(t => t.equipo_id !== id);
  writeDB(db); res.json({ ok: true });
});

module.exports = router;
