const router = require('express').Router();
const { requireAuth, requireRol } = require('../middleware/auth');
const { readDB, writeDB, hoy } = require('../utils/db');

// Help Desk público (QR sin login)
router.get('/helpdesk/:codigo', (req, res) => {
  const db = readDB();
  const eq = db.equipos.find(e => e.codigo === req.params.codigo);
  if (!eq) return res.status(404).json({ error: 'Equipo no encontrado.' });
  const { id, codigo, nombre, tipo, area, marca, modelo } = eq;
  res.json({ id, codigo, nombre, tipo, area, marca, modelo });
});

// Listar tickets según rol
router.get('/', requireAuth, (req, res) => {
  const db = readDB();
  const { rol, empresa } = req.session.usuario;
  const eqMap = Object.fromEntries(db.equipos.map(e => [e.id, e]));
  let tickets = db.tickets;
  if (rol === 'cliente') tickets = tickets.filter(t => { const eq = eqMap[t.equipo_id]; return eq && eq.empresa === empresa; });
  res.json(tickets.map(t => ({ ...t, equipo: eqMap[t.equipo_id]||null })).sort((a,b) => b.fecha_creacion.localeCompare(a.fecha_creacion)));
});

// Crear ticket (todos los roles autenticados)
router.post('/', requireAuth, (req, res) => {
  const { equipo_id, tipo_falla, descripcion, reportado_por, contacto } = req.body;
  if (!equipo_id || !descripcion || !reportado_por) return res.status(400).json({ error: 'Faltan campos.' });
  const db = readDB();
  if (!db.equipos.find(e => e.id === parseInt(equipo_id))) return res.status(404).json({ error: 'Equipo no encontrado.' });
  const u = req.session.usuario;
  const nuevo = {
    id: db.nextIds.ticket++, equipo_id: parseInt(equipo_id),
    tipo_falla: tipo_falla||'Sin especificar', descripcion,
    reportado_por, reportado_por_id: u?.id||null, contacto: contacto||null,
    estatus: 'abierto', asignado_a: null, asignado_a_id: null, notas_tecnico: null,
    fecha_creacion: new Date().toISOString(), fecha_atencion: null, fecha_cierre: null
  };
  db.tickets.push(nuevo); writeDB(db);
  res.status(201).json(nuevo);
});

// Actualizar ticket (admin + usuario)
router.put('/:id', requireRol('admin','usuario'), (req, res) => {
  const db = readDB();
  const idx = db.tickets.findIndex(t => t.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Ticket no encontrado.' });
  const { estatus, notas_tecnico, asignado_a, asignado_a_id } = req.body;
  const t = db.tickets[idx];
  if (estatus) t.estatus = estatus;
  if (notas_tecnico !== undefined) t.notas_tecnico = notas_tecnico;
  if (asignado_a !== undefined) t.asignado_a = asignado_a;
  if (asignado_a_id !== undefined) t.asignado_a_id = asignado_a_id;
  if (estatus === 'en_proceso' && !t.fecha_atencion) t.fecha_atencion = new Date().toISOString();
  if (estatus === 'cerrado' && !t.fecha_cierre) {
    t.fecha_cierre = new Date().toISOString();
    if (notas_tecnico) {
      const tecnico = req.session.usuario.nombre;
      db.mantenimientos.push({ id: db.nextIds.mantenimiento++, equipo_id: t.equipo_id, tipo: 'Correctivo', fecha: hoy(), tecnico, descripcion: `[Ticket #${t.id}] ${t.descripcion}`, observaciones: notas_tecnico, costo: null, registrado_por: tecnico });
    }
  }
  writeDB(db); res.json(db.tickets[idx]);
});

module.exports = router;
