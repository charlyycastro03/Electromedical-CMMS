function requireAuth(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ error: 'No autorizado. Token requerido.' });
  }
  next();
}

function requireRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autorizado.' });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'Sin permisos para esta acción.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRol };
