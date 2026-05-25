// ─────────────────────────────────────────────
//  routes/mantenimientos.js — Historial de mantenimientos
// ─────────────────────────────────────────────
const router = require('express').Router();
const { requireRol } = require('../middleware/auth');
const { readDB, writeDB, calcularProxima, actualizarEstados } = require('../utils/db');

// POST /api/mantenimientos — Registrar mantenimiento (admin + usuario)
router.post('/', requireRol('admin', 'usuario'), (req, res) => {
  const { equipo_id, tipo, fecha, tecnico, descripcion, observaciones, costo } = req.body;

  if (!equipo_id || !tipo || !fecha || !tecnico) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }

  const db     = readDB();
  const equipo = db.equipos.find(e => e.id === parseInt(equipo_id));
  if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado.' });

  const nuevo = {
    id:          db.nextIds.mantenimiento++,
    equipo_id:   parseInt(equipo_id),
    tipo,
    fecha,
    tecnico,
    descripcion:  descripcion  || null,
    observaciones: observaciones || null,
    costo:        costo ? parseFloat(costo) : null,
    registrado_por: req.session.usuario.nombre,
  };

  db.mantenimientos.push(nuevo);

  // Actualizar fechas del equipo
  equipo.ultimo_mantenimiento  = fecha;
  equipo.proximo_mantenimiento = calcularProxima(fecha, equipo.frecuencia_meses);
  actualizarEstados(db);

  writeDB(db);
  res.status(201).json(nuevo);
});

// DELETE /api/mantenimientos/:id — Solo admin
router.delete('/:id', requireRol('admin'), (req, res) => {
  const db  = readDB();
  const idx = db.mantenimientos.findIndex(m => m.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Mantenimiento no encontrado.' });

  db.mantenimientos.splice(idx, 1);
  writeDB(db);
  res.json({ ok: true });
});

module.exports = router;
