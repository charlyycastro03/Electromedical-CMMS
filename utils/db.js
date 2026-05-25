const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lwhaqmifmdmnwbobjlsn.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_96TEtks4Hr2Y3jF4d1xSMg_amc7K6B6';
const API = `${SUPABASE_URL}/rest/v1`;

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function api(path, opts = {}) {
  const url = `${API}/${path}`;
  const res = await fetch(url, { ...opts, headers: { ...headers, ...opts.headers } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function hoy() { return new Date().toISOString().split('T')[0]; }

function calcularProxima(fecha, meses) {
  if (!fecha) return null;
  const d = new Date(fecha);
  d.setMonth(d.getMonth() + parseInt(meses));
  return d.toISOString().split('T')[0];
}

function calcularEstado(proximo) {
  if (!proximo) return 'sin_fecha';
  const dias = Math.ceil((new Date(proximo) - new Date()) / 86400000);
  if (dias < 0) return 'vencido';
  if (dias <= 30) return 'proximo';
  return 'al_dia';
}

async function actualizarEstados() {
  await api('rpc/actualizar_estados_equipos', { method: 'POST', body: '{}' });
}

// ── Usuarios ──────────────────────────────────

async function findUserByEmail(email) {
  const users = await api(`usuarios?email=eq.${encodeURIComponent(email)}&activo=eq.true&select=*`);
  return users[0] || null;
}

async function findUserByEmailAll(email) {
  const users = await api(`usuarios?email=eq.${encodeURIComponent(email)}&select=*`);
  return users[0] || null;
}

async function createUser({ nombre, email, password, rol, empresa }) {
  const users = await api('usuarios', {
    method: 'POST',
    body: JSON.stringify({ nombre, email, password, rol, empresa: empresa || 'Electromedical' })
  });
  const { password: _, ...seguro } = users[0];
  return seguro;
}

async function getActiveTechnicians() {
  return api("usuarios?activo=eq.true&rol=neq.cliente&select=id,nombre,email,rol,empresa,activo,fecha_registro");
}

async function getAllUsers() {
  return api("usuarios?select=id,nombre,email,rol,empresa,activo,fecha_registro");
}

async function deactivateUser(id) {
  await api(`usuarios?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ activo: false }) });
}

// ── Equipos ──────────────────────────────────

async function getAllEquipos() {
  return api('equipos?order=estado.asc&select=*');
}

async function getEquiposByEmpresa(empresa) {
  return api(`equipos?empresa=eq.${encodeURIComponent(empresa)}&order=estado.asc&select=*`);
}

async function getEquipoById(id) {
  const eqs = await api(`equipos?id=eq.${id}&select=*`);
  return eqs[0] || null;
}

async function getEquipoByCodigo(codigo) {
  const eqs = await api(`equipos?codigo=eq.${encodeURIComponent(codigo)}&select=*`);
  return eqs[0] || null;
}

async function createEquipo({ codigo, nombre, tipo, area, marca, modelo, num_serie, frecuencia_meses, ultimo_mantenimiento, empresa }) {
  const proximo = calcularProxima(ultimo_mantenimiento, frecuencia_meses);
  const estado = calcularEstado(proximo);
  const eqs = await api('equipos', {
    method: 'POST',
    body: JSON.stringify({ codigo, nombre, tipo, area, marca: marca||null, modelo: modelo||null, num_serie: num_serie||null, frecuencia_meses: parseInt(frecuencia_meses), ultimo_mantenimiento: ultimo_mantenimiento||null, proximo_mantenimiento: proximo, empresa: empresa||'Sin asignar', estado })
  });
  return eqs[0];
}

async function updateEquipoFechas(equipo_id, fecha, frecuencia_meses) {
  const proximo = calcularProxima(fecha, frecuencia_meses);
  const estado = calcularEstado(proximo);
  await api(`equipos?id=eq.${equipo_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ultimo_mantenimiento: fecha, proximo_mantenimiento: proximo, estado })
  });
}

async function deleteEquipo(id) {
  await api(`equipos?id=eq.${id}`, { method: 'DELETE' });
}

async function getMantenimientosByEquipoId(equipo_id) {
  return api(`mantenimientos?equipo_id=eq.${equipo_id}&order=fecha.desc&select=*`);
}

async function getTicketsByEquipoId(equipo_id) {
  return api(`tickets?equipo_id=eq.${equipo_id}&order=fecha_creacion.desc&select=*`);
}

async function getMantenimientoById(id) {
  const mants = await api(`mantenimientos?id=eq.${id}&select=*`);
  return mants[0] || null;
}

async function getEmpresasUnicas() {
  const eqs = await api('equipos?select=empresa&empresa=not.is.null&empresa=neq.');
  return [...new Set(eqs.map(e => e.empresa).filter(Boolean))].sort();
}

// ── Mantenimientos ───────────────────────────

async function createMantenimiento({ equipo_id, tipo, fecha, tecnico, descripcion, observaciones, costo, registrado_por }) {
  const mants = await api('mantenimientos', {
    method: 'POST',
    body: JSON.stringify({ equipo_id: parseInt(equipo_id), tipo, fecha, tecnico, descripcion: descripcion||null, observaciones: observaciones||null, costo: costo ? parseFloat(costo) : null, registrado_por })
  });
  return mants[0];
}

async function deleteMantenimiento(id) {
  await api(`mantenimientos?id=eq.${id}`, { method: 'DELETE' });
}

// ── Tickets ──────────────────────────────────

async function getTicketsWithEquipo() {
  return api('tickets?order=fecha_creacion.desc&select=*,equipo:equipos!equipo_id(nombre,codigo,empresa)');
}

async function getTicketsByEmpresa(empresa) {
  return api(`tickets?order=fecha_creacion.desc&select=*,equipo:equipos!equipo_id!inner(nombre,codigo,empresa)&equipo.empresa=eq.${encodeURIComponent(empresa)}`);
}

async function createTicket({ equipo_id, tipo_falla, descripcion, reportado_por, reportado_por_id, contacto }) {
  const tickets = await api('tickets', {
    method: 'POST',
    body: JSON.stringify({ equipo_id: parseInt(equipo_id), tipo_falla: tipo_falla||'Sin especificar', descripcion, reportado_por, reportado_por_id: reportado_por_id||null, contacto: contacto||null })
  });
  return tickets[0];
}

async function updateTicket(id, fields) {
  const body = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) body[k] = v;
  }
  if (!Object.keys(body).length) return;
  await api(`tickets?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

async function getTicketById(id) {
  const tickets = await api(`tickets?id=eq.${id}&select=*`);
  return tickets[0] || null;
}

async function createMantenimientoFromTicket({ equipo_id, fecha, tecnico, descripcion, observaciones, costo, registrado_por }) {
  return createMantenimiento({ equipo_id, tipo: 'Correctivo', fecha, tecnico, descripcion, observaciones, costo, registrado_por });
}

// ── Dashboard ────────────────────────────────

async function getDashboardStats() {
  const [eqs, tickets] = await Promise.all([api('equipos?select=*'), api('tickets?select=*')]);
  return {
    total_equipos: eqs.length,
    al_dia: eqs.filter(e => e.estado === 'al_dia').length,
    proximo: eqs.filter(e => e.estado === 'proximo').length,
    vencido: eqs.filter(e => e.estado === 'vencido').length,
    tickets_abiertos: tickets.filter(t => t.estatus === 'abierto').length,
    tickets_en_proceso: tickets.filter(t => t.estatus === 'en_proceso').length,
    tickets_cerrados: tickets.filter(t => t.estatus === 'cerrado').length
  };
}

module.exports = {
  hoy, calcularProxima, calcularEstado, actualizarEstados,
  findUserByEmail, findUserByEmailAll, createUser, getActiveTechnicians, getAllUsers, deactivateUser,
  getAllEquipos, getEquiposByEmpresa, getEquipoById, getEquipoByCodigo,
  createEquipo, updateEquipoFechas, deleteEquipo, getEmpresasUnicas,
  createMantenimiento, deleteMantenimiento, getMantenimientoById, getMantenimientosByEquipoId,
  getTicketsWithEquipo, getTicketsByEmpresa, getTicketsByEquipoId, createTicket, updateTicket, getTicketById,
  createMantenimientoFromTicket,
  getDashboardStats
};
