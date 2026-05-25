const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { readDB, writeDB, hoy } = require('../utils/db');

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos.' });
  const db = readDB();
  const u  = db.usuarios.find(u => u.email === email && u.activo);
  if (!u || !bcrypt.compareSync(password, u.password)) return res.status(401).json({ error: 'Credenciales incorrectas.' });
  const { password: _, ...seguro } = u;
  req.session.usuario = seguro;
  res.json({ ok: true, usuario: seguro });
});

// Registro público (solo cliente o usuario)
router.post('/register', (req, res) => {
  const { nombre, email, password, rol, empresa } = req.body;
  if (!nombre || !email || !password || !rol) return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  if (!['cliente','usuario'].includes(rol)) return res.status(400).json({ error: 'Rol no permitido.' });
  if (rol === 'cliente' && !empresa) return res.status(400).json({ error: 'Indica tu hospital o empresa.' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres.' });
  const db = readDB();
  if (db.usuarios.find(u => u.email === email)) return res.status(400).json({ error: 'Email ya registrado.' });
  const nuevo = { id: db.nextIds.usuario++, nombre, email, password: bcrypt.hashSync(password, 10), rol, empresa: empresa || 'Electromedical', activo: true, fecha_registro: hoy() };
  db.usuarios.push(nuevo);
  writeDB(db);
  const { password: _, ...seguro } = nuevo;
  req.session.usuario = seguro;
  res.status(201).json({ ok: true, usuario: seguro });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// Verificar sesión
router.get('/me', (req, res) => {
  if (!req.session?.usuario) return res.json({ autenticado: false });
  res.json({ autenticado: true, usuario: req.session.usuario });
});

module.exports = router;
