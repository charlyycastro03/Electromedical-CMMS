const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { actualizarEstados, query } = require('../utils/db');

router.get('/', requireAuth, async (req, res) => {
  try {
    await actualizarEstados();
    const hoy = new Date();

    const stats = (await query(`
      SELECT
        (SELECT COUNT(*) FROM equipos)::int AS total_equipos,
        (SELECT COUNT(*) FROM equipos WHERE estado = 'al_dia')::int AS al_dia,
        (SELECT COUNT(*) FROM equipos WHERE estado = 'proximo')::int AS proximo,
        (SELECT COUNT(*) FROM equipos WHERE estado = 'vencido')::int AS vencido,
        (SELECT COUNT(*) FROM tickets WHERE estatus = 'abierto')::int AS tickets_abiertos,
        (SELECT COUNT(*) FROM tickets WHERE estatus = 'en_proceso')::int AS tickets_en_proceso,
        (SELECT COUNT(*) FROM tickets WHERE estatus = 'cerrado')::int AS tickets_cerrados
    `)).rows[0];

    const alertas = (await query(`
      SELECT *, CASE
        WHEN proximo_mantenimiento IS NOT NULL THEN EXTRACT(DAY FROM proximo_mantenimiento - CURRENT_DATE)::int
        ELSE NULL
      END AS dias_restantes
      FROM equipos WHERE estado IN ('proximo','vencido')
      ORDER BY CASE WHEN proximo_mantenimiento IS NOT NULL THEN proximo_mantenimiento ELSE '9999-12-31' END
      LIMIT 8
    `)).rows;

    const porArea = (await query(`
      SELECT area, COUNT(*)::int AS count FROM equipos GROUP BY area ORDER BY count DESC
    `)).rows;

    const equiposCriticos = (await query(`
      SELECT e.*, COUNT(t.id)::int AS fallas
      FROM equipos e LEFT JOIN tickets t ON t.equipo_id = e.id
      GROUP BY e.id ORDER BY fallas DESC LIMIT 5
    `)).rows;

    const promedioResolucion = (await query(`
      SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (fecha_cierre - fecha_creacion))/3600)), 0)::int AS promedio_horas
      FROM tickets WHERE estatus = 'cerrado' AND fecha_creacion IS NOT NULL AND fecha_cierre IS NOT NULL
    `)).rows[0];

    const ticketsRecientes = (await query(`
      SELECT t.*, e.nombre AS equipo_nombre
      FROM tickets t LEFT JOIN equipos e ON t.equipo_id = e.id
      ORDER BY t.fecha_creacion DESC LIMIT 5
    `)).rows;

    res.json({
      equipos: { total: stats.total_equipos, al_dia: stats.al_dia, proximo: stats.proximo, vencido: stats.vencido },
      tickets: { abiertos: stats.tickets_abiertos, en_proceso: stats.tickets_en_proceso, cerrados: stats.tickets_cerrados, promedio_horas: promedioResolucion.promedio_horas },
      alertas,
      porArea: Object.fromEntries(porArea.map(a => [a.area, a.count])),
      equiposCriticos,
      ticketsRecientes,
    });
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

module.exports = router;
