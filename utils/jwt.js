const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'electromedical-jwt-2026';

function generarToken(usuario) {
  const payload = {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    empresa: usuario.empresa,
    activo: usuario.activo,
    fecha_registro: usuario.fecha_registro
  };
  return jwt.sign(payload, SECRET, { expiresIn: '8h' });
}

function verificarToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido.' });
  }
  try {
    const token = header.split(' ')[1];
    req.usuario = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

function obtenerUsuarioDeToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.split(' ')[1], SECRET);
  } catch (e) {
    return null;
  }
}

module.exports = { generarToken, verificarToken, obtenerUsuarioDeToken };
