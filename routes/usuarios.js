const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { requireRol } = require('../middleware/auth');
const { findUserByEmailAll, createUser, getActiveTechnicians, getAllUsers, deactivateUser } = require('../utils/db');

router.get('/tecnicos', requireRol('admin','usuario'), async (req, res) => {
  try {
    const tecnicos = await getActiveTechnicians();
    res.json(tecnicos);
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

router.get('/', requireRol('admin'), async (req, res) => {
  try {
    const usuarios = await getAllUsers();
    res.json(usuarios);
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

router.post('/', requireRol('admin'), async (req, res) => {
  try {
    const { nombre, email, password, rol, empresa } = req.body;
    if (!nombre || !email || !password || !rol) return res.status(400).json({ error: 'Faltan campos.' });
    if (!['admin','usuario','cliente'].includes(rol)) return res.status(400).json({ error: 'Rol inválido.' });
    const existente = await findUserByEmailAll(email);
    if (existente) return res.status(400).json({ error: 'Email ya registrado.' });
    const nuevo = await createUser({ nombre, email, password: bcrypt.hashSync(password, 10), rol, empresa });
    res.status(201).json(nuevo);
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

router.delete('/:id', requireRol('admin'), async (req, res) => {
  try {
    const uId = parseInt(req.params.id);
    if (uId === req.usuario.id) return res.status(400).json({ error: 'No puedes desactivarte a ti mismo.' });
    await deactivateUser(uId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

module.exports = router;
