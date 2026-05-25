// ─────────────────────────────────────────────
//  routes/dashboard.js — Estadísticas y KPIs
// ─────────────────────────────────────────────
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { readDB, writeDB, actualizarEstados } = require('../utils/db');

router.get('/', requireAuth, (req, res) => {
  const db = readDB();
  actualizarEstados(db);
  writeDB(db);

  const hoy        = new Date();
  const equipos    = db.equipos;
  const tickets    = db.tickets;
  const mants      = db.mantenimientos;

  // ── KPIs de equipos ──────────────────────
  const totalEquipos = equipos.length;
  const al_dia       = equipos.filter(e => e.estado === 'al_dia').length;
  const proximo      = equipos.filter(e => e.estado === 'proximo').length;
  const vencido      = equipos.filter(e => e.estado === 'vencido').length;

  // ── KPIs de tickets ───────────────────────
  const ticketsAbiertos   = tickets.filter(t => t.estatus === 'abierto').length;
  const ticketsEnProceso  = tickets.filter(t => t.estatus === 'en_proceso').length;
  const ticketsCerrados   = tickets.filter(t => t.estatus === 'cerrado').length;

  // Tiempo promedio de resolución (en horas)
  const cerrados = tickets.filter(t => t.estatus === 'cerrado' && t.fecha_creacion && t.fecha_cierre);
  const promedioResolucion = cerrados.length > 0
    ? Math.round(cerrados.reduce((acc, t) => {
        const diff = new Date(t.fecha_cierre) - new Date(t.fecha_creacion);
        return acc + diff / 3600000;
      }, 0) / cerrados.length)
    : 0;

  // ── Alertas próximas ──────────────────────
  const alertas = equipos
    .filter(e => e.estado === 'proximo' || e.estado === 'vencido')
    .map(e => ({
      ...e,
      dias_restantes: e.proximo_mantenimiento
        ? Math.ceil((new Date(e.proximo_mantenimiento) - hoy) / 86400000)
        : null,
    }))
    .sort((a, b) => (a.dias_restantes ?? 999) - (b.dias_restantes ?? 999))
    .slice(0, 8);

  // ── Equipos por área ──────────────────────
  const porArea = equipos.reduce((acc, e) => {
    acc[e.area] = (acc[e.area] || 0) + 1;
    return acc;
  }, {});

  // ── Equipos con más fallas (tickets) ──────
  const fallasPorEquipo = tickets.reduce((acc, t) => {
    acc[t.equipo_id] = (acc[t.equipo_id] || 0) + 1;
    return acc;
  }, {});
  const equiposCriticos = equipos
    .map(e => ({ ...e, fallas: fallasPorEquipo[e.id] || 0 }))
    .filter(e => e.fallas > 0)
    .sort((a, b) => b.fallas - a.fallas)
    .slice(0, 5);

  // ── Tickets recientes ─────────────────────
  const equiposMap = Object.fromEntries(equipos.map(e => [e.id, e.nombre]));
  const ticketsRecientes = tickets
    .sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion))
    .slice(0, 5)
    .map(t => ({ ...t, equipo_nombre: equiposMap[t.equipo_id] || '—' }));

  res.json({
    equipos:    { total: totalEquipos, al_dia, proximo, vencido },
    tickets:    { abiertos: ticketsAbiertos, en_proceso: ticketsEnProceso, cerrados: ticketsCerrados, promedio_horas: promedioResolucion },
    alertas,
    porArea,
    equiposCriticos,
    ticketsRecientes,
  });
});

module.exports = router;
