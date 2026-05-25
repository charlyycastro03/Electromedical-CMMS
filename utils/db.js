const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
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
  await query(`
    UPDATE equipos SET estado = CASE
      WHEN proximo_mantenimiento IS NULL THEN 'sin_fecha'
      WHEN proximo_mantenimiento < CURRENT_DATE THEN 'vencido'
      WHEN proximo_mantenimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'proximo'
      ELSE 'al_dia'
    END
  `);
}

// ── Usuarios ──────────────────────────────────

async function findUserByEmail(email) {
  const r = await query('SELECT * FROM usuarios WHERE email = $1 AND activo = true', [email]);
  return r.rows[0] || null;
}

async function findUserByEmailAll(email) {
  const r = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
  return r.rows[0] || null;
}

async function createUser({ nombre, email, password, rol, empresa }) {
  const r = await query(
    'INSERT INTO usuarios (nombre, email, password, rol, empresa) VALUES ($1,$2,$3,$4,$5) RETURNING id, nombre, email, rol, empresa, activo, fecha_registro',
    [nombre, email, password, rol, empresa || 'Electromedical']
  );
  return r.rows[0];
}

async function getActiveTechnicians() {
  const r = await query("SELECT id, nombre, email, rol, empresa, activo, fecha_registro FROM usuarios WHERE activo = true AND rol != 'cliente'");
  return r.rows;
}

async function getAllUsers() {
  const r = await query('SELECT id, nombre, email, rol, empresa, activo, fecha_registro FROM usuarios');
  return r.rows;
}

async function deactivateUser(id) {
  await query('UPDATE usuarios SET activo = false WHERE id = $1', [id]);
}

// ── Equipos ──────────────────────────────────

async function getAllEquipos() {
  const r = await query('SELECT * FROM equipos ORDER BY estado ASC');
  return r.rows;
}

async function getEquiposByEmpresa(empresa) {
  const r = await query('SELECT * FROM equipos WHERE empresa = $1 ORDER BY estado ASC', [empresa]);
  return r.rows;
}

async function getEquipoById(id) {
  const r = await query('SELECT * FROM equipos WHERE id = $1', [id]);
  return r.rows[0] || null;
}

async function getEquipoByCodigo(codigo) {
  const r = await query('SELECT * FROM equipos WHERE codigo = $1', [codigo]);
  return r.rows[0] || null;
}

async function createEquipo({ codigo, nombre, tipo, area, marca, modelo, num_serie, frecuencia_meses, ultimo_mantenimiento, empresa }) {
  const proximo = calcularProxima(ultimo_mantenimiento, frecuencia_meses);
  const estado = calcularEstado(proximo);
  const r = await query(
    `INSERT INTO equipos (codigo, nombre, tipo, area, marca, modelo, num_serie, frecuencia_meses, ultimo_mantenimiento, proximo_mantenimiento, empresa, estado)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [codigo, nombre, tipo, area, marca||null, modelo||null, num_serie||null, parseInt(frecuencia_meses), ultimo_mantenimiento||null, proximo, empresa||'Sin asignar', estado]
  );
  return r.rows[0];
}

async function updateEquipoFechas(equipo_id, fecha, frecuencia_meses) {
  const proximo = calcularProxima(fecha, frecuencia_meses);
  const estado = calcularEstado(proximo);
  await query('UPDATE equipos SET ultimo_mantenimiento = $1, proximo_mantenimiento = $2, estado = $3 WHERE id = $4', [fecha, proximo, estado, equipo_id]);
}

async function deleteEquipo(id) {
  await query('DELETE FROM equipos WHERE id = $1', [id]);
}

async function getEmpresasUnicas() {
  const r = await query('SELECT DISTINCT empresa FROM equipos WHERE empresa IS NOT NULL AND empresa != \'\' ORDER BY empresa');
  return r.rows.map(r => r.empresa);
}

// ── Mantenimientos ───────────────────────────

async function createMantenimiento({ equipo_id, tipo, fecha, tecnico, descripcion, observaciones, costo, registrado_por }) {
  const r = await query(
    `INSERT INTO mantenimientos (equipo_id, tipo, fecha, tecnico, descripcion, observaciones, costo, registrado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [parseInt(equipo_id), tipo, fecha, tecnico, descripcion||null, observaciones||null, costo ? parseFloat(costo) : null, registrado_por]
  );
  return r.rows[0];
}

async function deleteMantenimiento(id) {
  await query('DELETE FROM mantenimientos WHERE id = $1', [id]);
}

// ── Tickets ──────────────────────────────────

async function getTicketsWithEquipo() {
  const r = await query(`
    SELECT t.*, e.nombre AS equipo_nombre, e.codigo AS equipo_codigo, e.empresa AS equipo_empresa
    FROM tickets t LEFT JOIN equipos e ON t.equipo_id = e.id
    ORDER BY t.fecha_creacion DESC
  `);
  return r.rows;
}

async function getTicketsByEmpresa(empresa) {
  const r = await query(`
    SELECT t.*, e.nombre AS equipo_nombre, e.codigo AS equipo_codigo
    FROM tickets t LEFT JOIN equipos e ON t.equipo_id = e.id
    WHERE e.empresa = $1
    ORDER BY t.fecha_creacion DESC
  `, [empresa]);
  return r.rows;
}

async function createTicket({ equipo_id, tipo_falla, descripcion, reportado_por, reportado_por_id, contacto }) {
  const r = await query(
    `INSERT INTO tickets (equipo_id, tipo_falla, descripcion, reportado_por, reportado_por_id, contacto)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [parseInt(equipo_id), tipo_falla||'Sin especificar', descripcion, reportado_por, reportado_por_id||null, contacto||null]
  );
  return r.rows[0];
}

async function updateTicket(id, fields) {
  const keys = Object.keys(fields).filter(k => fields[k] !== undefined);
  if (!keys.length) return;
  const sets = keys.map((k, i) => `${k} = $${i+1}`);
  const vals = keys.map(k => fields[k]);
  vals.push(id);
  await query(`UPDATE tickets SET ${sets.join(', ')} WHERE id = $${keys.length+1}`, vals);
}

async function getTicketById(id) {
  const r = await query('SELECT * FROM tickets WHERE id = $1', [id]);
  return r.rows[0] || null;
}

async function createMantenimientoFromTicket({ equipo_id, fecha, tecnico, descripcion, observaciones, costo, registrado_por, ticket_id }) {
  const r = await query(
    `INSERT INTO mantenimientos (equipo_id, tipo, fecha, tecnico, descripcion, observaciones, costo, registrado_por)
     VALUES ($1,'Correctivo',$2,$3,$4,$5,$6,$7) RETURNING *`,
    [equipo_id, fecha, tecnico, descripcion, observaciones, costo, registrado_por]
  );
  return r.rows[0];
}

// ── Dashboard / Stats ────────────────────────

async function getDashboardStats() {
  const r = await query(`
    SELECT
      (SELECT COUNT(*) FROM equipos)::int AS total_equipos,
      (SELECT COUNT(*) FROM equipos WHERE estado = 'al_dia')::int AS al_dia,
      (SELECT COUNT(*) FROM equipos WHERE estado = 'proximo')::int AS proximo,
      (SELECT COUNT(*) FROM equipos WHERE estado = 'vencido')::int AS vencido,
      (SELECT COUNT(*) FROM tickets WHERE estatus = 'abierto')::int AS tickets_abiertos,
      (SELECT COUNT(*) FROM tickets WHERE estatus = 'en_proceso')::int AS tickets_en_proceso,
      (SELECT COUNT(*) FROM tickets WHERE estatus = 'cerrado')::int AS tickets_cerrados
  `);
  return r.rows[0];
}

module.exports = {
  pool, query,
  hoy, calcularProxima, calcularEstado, actualizarEstados,
  findUserByEmail, findUserByEmailAll, createUser, getActiveTechnicians, getAllUsers, deactivateUser,
  getAllEquipos, getEquiposByEmpresa, getEquipoById, getEquipoByCodigo,
  createEquipo, updateEquipoFechas, deleteEquipo, getEmpresasUnicas,
  createMantenimiento, deleteMantenimiento,
  getTicketsWithEquipo, getTicketsByEmpresa, createTicket, updateTicket, getTicketById,
  createMantenimientoFromTicket,
  getDashboardStats
};
