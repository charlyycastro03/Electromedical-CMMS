const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { requireRol } = require('../middleware/auth');
const { readDB, writeDB, hoy } = require('../utils/db');

// Técnicos para asignar tickets (no clientes)
router.get('/tecnicos', requireRol('admin','usuario'), (req, res) => {
  const db = readDB();
  res.json(db.usuarios.filter(u => u.activo && u.rol !== 'cliente').map(({ password: _, ...u }) => u));
});

// Todos los usuarios (solo admin)
router.get('/', requireRol('admin'), (req, res) => {
  const db = readDB();
  res.json(db.usuarios.map(({ password: _, ...u }) => u));
});

// Crear usuario (solo admin)
router.post('/', requireRol('admin'), (req, res) => {
  const { nombre, email, password, rol, empresa } = req.body;
  if (!nombre || !email || !password || !rol) return res.status(400).json({ error: 'Faltan campos.' });
  if (!['admin','usuario','cliente'].includes(rol)) return res.status(400).json({ error: 'Rol inválido.' });
  const db = readDB();
  if (db.usuarios.find(u => u.email === email)) return res.status(400).json({ error: 'Email ya registrado.' });
  const nuevo = { id: db.nextIds.usuario++, nombre, email, password: bcrypt.hashSync(password, 10), rol, empresa: empresa || 'Electromedical', activo: true, fecha_registro: hoy() };
  db.usuarios.push(nuevo);
  writeDB(db);
  const { password: _, ...seguro } = nuevo;
  res.status(201).json(seguro);
});

// Desactivar usuario (solo admin)
router.delete('/:id', requireRol('admin'), (req, res) => {
  const db = readDB();
  const u  = db.usuarios.find(u => u.id === parseInt(req.params.id));
  if (!u) return res.status(404).json({ error: 'No encontrado.' });
  if (u.id === req.session.usuario.id) return res.status(400).json({ error: 'No puedes desactivarte a ti mismo.' });
  u.activo = false;
  writeDB(db);
  res.json({ ok: true });
});

module.exports = router;
