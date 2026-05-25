const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { actualizarEstados, getAllEquipos, getTicketsWithEquipo } = require('../utils/db');

router.get('/', requireAuth, async (req, res) => {
  try {
    await actualizarEstados();
    const hoy = new Date();
    const equipos = await getAllEquipos();
    const tickets = await getTicketsWithEquipo();

    const stats = {
      total_equipos: equipos.length,
      al_dia: equipos.filter(e => e.estado === 'al_dia').length,
      proximo: equipos.filter(e => e.estado === 'proximo').length,
      vencido: equipos.filter(e => e.estado === 'vencido').length,
      tickets_abiertos: tickets.filter(t => t.estatus === 'abierto').length,
      tickets_en_proceso: tickets.filter(t => t.estatus === 'en_proceso').length,
      tickets_cerrados: tickets.filter(t => t.estatus === 'cerrado').length
    };

    const alertas = equipos
      .filter(e => e.estado === 'proximo' || e.estado === 'vencido')
      .map(e => ({
        ...e,
        dias_restantes: e.proximo_mantenimiento
          ? Math.ceil((new Date(e.proximo_mantenimiento) - hoy) / 86400000)
          : null
      }))
      .sort((a, b) => (a.dias_restantes ?? 999) - (b.dias_restantes ?? 999))
      .slice(0, 8);

    const porArea = equipos.reduce((acc, e) => {
      acc[e.area] = (acc[e.area] || 0) + 1;
      return acc;
    }, {});

    const fallasPorEquipo = tickets.reduce((acc, t) => {
      acc[t.equipo_id] = (acc[t.equipo_id] || 0) + 1;
      return acc;
    }, {});

    const equiposCriticos = equipos
      .map(e => ({ ...e, fallas: fallasPorEquipo[e.id] || 0 }))
      .filter(e => e.fallas > 0)
      .sort((a, b) => b.fallas - a.fallas)
      .slice(0, 5);

    const cerrados = tickets.filter(t => t.estatus === 'cerrado' && t.fecha_creacion && t.fecha_cierre);
    const promedio_horas = cerrados.length > 0
      ? Math.round(cerrados.reduce((acc, t) => {
          const diff = new Date(t.fecha_cierre) - new Date(t.fecha_creacion);
          return acc + diff / 3600000;
        }, 0) / cerrados.length)
      : 0;

    const ticketsRecientes = tickets.slice(0, 5).map(t => ({
      ...t,
      equipo_nombre: t.equipo_nombre || '—'
    }));

    res.json({
      equipos: { total: stats.total_equipos, al_dia: stats.al_dia, proximo: stats.proximo, vencido: stats.vencido },
      tickets: { abiertos: stats.tickets_abiertos, en_proceso: stats.tickets_en_proceso, cerrados: stats.tickets_cerrados, promedio_horas },
      alertas,
      porArea,
      equiposCriticos,
      ticketsRecientes,
    });
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

module.exports = router;
