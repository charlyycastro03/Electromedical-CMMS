const router = require('express').Router();
const { requireAuth, requireRol } = require('../middleware/auth');
const { getAllEquipos, getEquiposByEmpresa, getEquipoById, getEquipoByCodigo,
        createEquipo, deleteEquipo, getEmpresasUnicas, actualizarEstados,
        getMantenimientosByEquipoId, getTicketsByEquipoId } = require('../utils/db');

router.get('/', requireAuth, async (req, res) => {
  try {
    await actualizarEstados();
    const { rol, empresa } = req.session.usuario;
    const list = rol === 'cliente' ? await getEquiposByEmpresa(empresa) : await getAllEquipos();
    const ord = { vencido:0, proximo:1, al_dia:2, sin_fecha:3 };
    res.json(list.sort((a,b) => (ord[a.estado]??9)-(ord[b.estado]??9)));
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

router.get('/empresas', requireAuth, async (req, res) => {
  try {
    const empresas = await getEmpresasUnicas();
    res.json(empresas);
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rol, empresa } = req.session.usuario;
    const eq = await getEquipoById(parseInt(req.params.id));
    if (!eq) return res.status(404).json({ error: 'Equipo no encontrado.' });
    if (rol === 'cliente' && eq.empresa !== empresa) return res.status(403).json({ error: 'Sin acceso.' });
    const mants = await getMantenimientosByEquipoId(eq.id);
    const tickets = await getTicketsByEquipoId(eq.id);
    res.json({ equipo: eq, mantenimientos: mants, tickets });
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

router.post('/', requireRol('admin','usuario'), async (req, res) => {
  try {
    const { codigo, nombre, tipo, area, marca, modelo, num_serie, frecuencia_meses, ultimo_mantenimiento, empresa } = req.body;
    if (!codigo || !nombre || !tipo || !area || !frecuencia_meses) return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    const existente = await getEquipoByCodigo(codigo);
    if (existente) return res.status(400).json({ error: 'Código ya existe.' });
    const nuevo = await createEquipo({ codigo, nombre, tipo, area, marca, modelo, num_serie, frecuencia_meses, ultimo_mantenimiento, empresa });
    res.status(201).json(nuevo);
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

router.post('/importar', requireRol('admin','usuario'), async (req, res) => {
  try {
    const { equipos } = req.body;
    if (!Array.isArray(equipos) || !equipos.length) return res.status(400).json({ error: 'Sin datos.' });
    const errores = []; let importados = 0;
    for (const [i, row] of equipos.entries()) {
      if (!row.codigo || !row.nombre || !row.tipo || !row.area || !row.frecuencia_meses) { errores.push(`Fila ${i+2}: faltan campos`); continue; }
      const existente = await getEquipoByCodigo(row.codigo);
      if (existente) { errores.push(`Fila ${i+2}: código "${row.codigo}" ya existe`); continue; }
      await createEquipo(row);
      importados++;
    }
    res.json({ importados, errores });
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

router.delete('/:id', requireRol('admin'), async (req, res) => {
  try {
    await deleteEquipo(parseInt(req.params.id));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

module.exports = router;
