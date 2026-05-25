const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const DB_PATH = path.join(__dirname, '..', 'database.json');

function readDB() {
  if (!fs.existsSync(DB_PATH)) return emptyDB();
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return emptyDB(); }
}
function writeDB(db) { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }
function emptyDB() { return { usuarios:[], equipos:[], mantenimientos:[], tickets:[], nextIds:{ usuario:1, equipo:1, mantenimiento:1, ticket:1 } }; }
function hoy() { return new Date().toISOString().split('T')[0]; }
function calcularProxima(fecha, meses) { if (!fecha) return null; const d = new Date(fecha); d.setMonth(d.getMonth() + parseInt(meses)); return d.toISOString().split('T')[0]; }
function calcularEstado(proximo) { if (!proximo) return 'sin_fecha'; const dias = Math.ceil((new Date(proximo) - new Date()) / 86400000); if (dias < 0) return 'vencido'; if (dias <= 30) return 'proximo'; return 'al_dia'; }
function actualizarEstados(db) { for (const eq of db.equipos) eq.estado = calcularEstado(eq.proximo_mantenimiento); }

async function seedDB() {
  const db = readDB();
  if (db.usuarios.length > 0) { if (!db.nextIds.ticket) { db.nextIds.ticket = (db.tickets?.length||0) + 1; writeDB(db); } return; }
  const h = p => bcrypt.hashSync(p, 10);
  db.usuarios = [
    { id:1, nombre:'Administrador',    email:'admin@electromedical.com', password:h('Admin2026'),   rol:'admin',   empresa:'Electromedical',              activo:true, fecha_registro:hoy() },
    { id:2, nombre:'Ing. Carlos Ruiz', email:'carlos@electromedical.com',password:h('User2026'),    rol:'usuario', empresa:'Electromedical',              activo:true, fecha_registro:hoy() },
    { id:3, nombre:'Hospital Regional',email:'hospital@cliente.com',     password:h('Cliente2026'), rol:'cliente', empresa:'Hospital Regional del Norte', activo:true, fecha_registro:hoy() },
  ];
  db.nextIds.usuario = 4;
  const emp = 'Hospital Regional del Norte';
  db.equipos = [
    { id:1, codigo:'BIO-001', nombre:'Ventilador Mecánico A',    tipo:'Ventilador mecánico',       area:'UCI',            marca:'Maquet',  modelo:'SERVO-i',       num_serie:'SN-2021-001', frecuencia_meses:3,  ultimo_mantenimiento:'2024-11-01', proximo_mantenimiento:'2025-02-01', empresa:emp, estado:'vencido', fecha_registro:hoy() },
    { id:2, codigo:'BIO-002', nombre:'Monitor Signos Vitales 1', tipo:'Monitor de signos vitales', area:'Urgencias',      marca:'Philips', modelo:'MX450',         num_serie:'SN-2022-045', frecuencia_meses:6,  ultimo_mantenimiento:'2025-03-15', proximo_mantenimiento:'2025-09-15', empresa:emp, estado:'al_dia',  fecha_registro:hoy() },
    { id:3, codigo:'BIO-003', nombre:'Desfibrilador UCI',        tipo:'Desfibrilador',             area:'UCI',            marca:'Zoll',    modelo:'R Series',      num_serie:'SN-2020-012', frecuencia_meses:3,  ultimo_mantenimiento:'2025-01-10', proximo_mantenimiento:'2025-04-10', empresa:emp, estado:'vencido', fecha_registro:hoy() },
    { id:4, codigo:'BIO-004', nombre:'Bomba Infusión Quirófano', tipo:'Bomba de infusión',         area:'Quirófano',      marca:'Baxter',  modelo:'Sigma Spectrum',num_serie:'SN-2023-088', frecuencia_meses:6,  ultimo_mantenimiento:'2025-02-20', proximo_mantenimiento:'2025-08-20', empresa:emp, estado:'al_dia',  fecha_registro:hoy() },
    { id:5, codigo:'BIO-005', nombre:'Cama Hospitalaria Piso 2', tipo:'Cama hospitalaria',         area:'Hospitalización',marca:'Hill-Rom',modelo:'P500',          num_serie:'SN-2019-200', frecuencia_meses:12, ultimo_mantenimiento:'2024-05-01', proximo_mantenimiento:'2025-05-01', empresa:emp, estado:'proximo', fecha_registro:hoy() },
  ];
  db.nextIds.equipo = 6;
  db.mantenimientos = [
    { id:1, equipo_id:1, tipo:'Preventivo', fecha:'2024-11-01', tecnico:'Ing. Carlos Ruiz', descripcion:'Mantenimiento preventivo trimestral', observaciones:'Todo en orden', costo:1200 },
    { id:2, equipo_id:2, tipo:'Preventivo', fecha:'2025-03-15', tecnico:'Ing. María López', descripcion:'Revisión semestral completa', observaciones:'Cambio de batería', costo:850 },
    { id:3, equipo_id:3, tipo:'Correctivo', fecha:'2025-01-10', tecnico:'Ing. Carlos Ruiz', descripcion:'Falla en pantalla', observaciones:'Se reemplazó módulo de pantalla', costo:3500 },
  ];
  db.nextIds.mantenimiento = 4;
  db.tickets = [
    { id:1, equipo_id:2, tipo_falla:'Alarma constante', descripcion:'El monitor suena constantemente', reportado_por:'Enf. María González', reportado_por_id:3, contacto:'Ext. 201', estatus:'abierto', asignado_a:null, asignado_a_id:null, notas_tecnico:null, fecha_creacion:new Date().toISOString(), fecha_atencion:null, fecha_cierre:null },
    { id:2, equipo_id:1, tipo_falla:'No enciende', descripcion:'El ventilador no enciende desde ayer', reportado_por:'Dr. Ramírez', reportado_por_id:3, contacto:'Ext. 305', estatus:'en_proceso', asignado_a:'Ing. Carlos Ruiz', asignado_a_id:2, notas_tecnico:'Revisando fusibles', fecha_creacion:new Date(Date.now()-86400000).toISOString(), fecha_atencion:new Date().toISOString(), fecha_cierre:null },
  ];
  db.nextIds.ticket = 3;
  writeDB(db);
  console.log('✅  Base de datos inicializada con datos de ejemplo');
}

module.exports = { readDB, writeDB, hoy, calcularProxima, calcularEstado, actualizarEstados, seedDB };
