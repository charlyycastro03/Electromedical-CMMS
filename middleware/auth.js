// ─────────────────────────────────────────────
//  middleware/auth.js — Sesión y control de roles
// ─────────────────────────────────────────────

// ── Verificar que haya sesión activa ────────
function requireAuth(req, res, next) {
  if (!req.session?.usuario) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión.' });
  }
  next();
}

// ── Fábrica de middleware por rol(es) ───────
function requireRol(...roles) {
  return (req, res, next) => {
    if (!req.session?.usuario) {
      return res.status(401).json({ error: 'No autorizado.' });
    }
    if (!roles.includes(req.session.usuario.rol)) {
      return res.status(403).json({ error: 'Sin permisos para esta acción.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRol };
