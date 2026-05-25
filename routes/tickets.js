const router = require('express').Router();
const { requireAuth, requireRol } = require('../middleware/auth');
const { getEquipoById, getEquipoByCodigo, getTicketsWithEquipo, getTicketsByEmpresa,
        createTicket, updateTicket, getTicketById, createMantenimientoFromTicket, hoy } = require('../utils/db');

router.get('/helpdesk/:codigo', async (req, res) => {
  try {
    const eq = await getEquipoByCodigo(req.params.codigo);
    if (!eq) return res.status(404).json({ error: 'Equipo no encontrado.' });
    const { id, codigo, nombre, tipo, area, marca, modelo } = eq;
    res.json({ id, codigo, nombre, tipo, area, marca, modelo });
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rol, empresa } = req.session.usuario;
    const tickets = rol === 'cliente' ? await getTicketsByEmpresa(empresa) : await getTicketsWithEquipo();
    res.json(tickets);
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { equipo_id, tipo_falla, descripcion, reportado_por, contacto } = req.body;
    if (!equipo_id || !descripcion || !reportado_por) return res.status(400).json({ error: 'Faltan campos.' });
    const eq = await getEquipoById(parseInt(equipo_id));
    if (!eq) return res.status(404).json({ error: 'Equipo no encontrado.' });
    const u = req.session.usuario;
    const nuevo = await createTicket({ equipo_id: parseInt(equipo_id), tipo_falla, descripcion, reportado_por, reportado_por_id: u?.id, contacto });
    res.status(201).json(nuevo);
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

router.put('/:id', requireRol('admin','usuario'), async (req, res) => {
  try {
    const ticket = await getTicketById(parseInt(req.params.id));
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado.' });
    const { estatus, notas_tecnico, asignado_a, asignado_a_id } = req.body;
    const updates = {};
    if (estatus) updates.estatus = estatus;
    if (notas_tecnico !== undefined) updates.notas_tecnico = notas_tecnico;
    if (asignado_a !== undefined) updates.asignado_a = asignado_a;
    if (asignado_a_id !== undefined) updates.asignado_a_id = asignado_a_id;
    if (estatus === 'en_proceso' && !ticket.fecha_atencion) updates.fecha_atencion = new Date().toISOString();
    if (estatus === 'cerrado' && !ticket.fecha_cierre) {
      updates.fecha_cierre = new Date().toISOString();
      if (notas_tecnico) {
        const tecnico = req.session.usuario.nombre;
        await createMantenimientoFromTicket({
          equipo_id: ticket.equipo_id,
          fecha: hoy(),
          tecnico,
          descripcion: `[Ticket #${ticket.id}] ${ticket.descripcion}`,
          observaciones: notas_tecnico,
          costo: null,
          registrado_por: tecnico
        });
      }
    }
    await updateTicket(parseInt(req.params.id), updates);
    const updated = await getTicketById(parseInt(req.params.id));
    res.json(updated);
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

module.exports = router;
