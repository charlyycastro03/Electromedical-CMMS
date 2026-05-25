const router = require('express').Router();
const { requireRol } = require('../middleware/auth');
const { getEquipoById, createMantenimiento, updateEquipoFechas, deleteMantenimiento, query } = require('../utils/db');

router.post('/', requireRol('admin','usuario'), async (req, res) => {
  try {
    const { equipo_id, tipo, fecha, tecnico, descripcion, observaciones, costo } = req.body;
    if (!equipo_id || !tipo || !fecha || !tecnico) return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    const equipo = await getEquipoById(parseInt(equipo_id));
    if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado.' });
    const nuevo = await createMantenimiento({
      equipo_id: parseInt(equipo_id), tipo, fecha, tecnico, descripcion, observaciones, costo,
      registrado_por: req.session.usuario.nombre
    });
    await updateEquipoFechas(parseInt(equipo_id), fecha, equipo.frecuencia_meses);
    res.status(201).json(nuevo);
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

router.delete('/:id', requireRol('admin'), async (req, res) => {
  try {
    const r = await query('SELECT id FROM mantenimientos WHERE id = $1', [parseInt(req.params.id)]);
    if (!r.rows.length) return res.status(404).json({ error: 'Mantenimiento no encontrado.' });
    await deleteMantenimiento(parseInt(req.params.id));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

module.exports = router;
