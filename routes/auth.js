const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { findUserByEmail, createUser, findUserByEmailAll } = require('../utils/db');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos.' });
    const u = await findUserByEmail(email);
    if (!u || !bcrypt.compareSync(password, u.password)) return res.status(401).json({ error: 'Credenciales incorrectas.' });
    const { password: _, ...seguro } = u;
    req.session.usuario = seguro;
    res.json({ ok: true, usuario: seguro });
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, rol, empresa } = req.body;
    if (!nombre || !email || !password || !rol) return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    if (!['cliente','usuario'].includes(rol)) return res.status(400).json({ error: 'Rol no permitido.' });
    if (rol === 'cliente' && !empresa) return res.status(400).json({ error: 'Indica tu hospital o empresa.' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres.' });
    const existente = await findUserByEmailAll(email);
    if (existente) return res.status(400).json({ error: 'Email ya registrado.' });
    const nuevo = await createUser({ nombre, email, password: bcrypt.hashSync(password, 10), rol, empresa });
    req.session.usuario = nuevo;
    res.status(201).json({ ok: true, usuario: nuevo });
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.session?.usuario) return res.json({ autenticado: false });
  res.json({ autenticado: true, usuario: req.session.usuario });
});

module.exports = router;
