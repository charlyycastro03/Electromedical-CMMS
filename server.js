// ═══════════════════════════════════════════════
//  Electromedical CMMS — server.js
//  Sistema de gestión de mantenimiento biomédico
// ═══════════════════════════════════════════════
const express = require('express');
const session = require('express-session');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware global ────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
// No cachear HTML para que el navegador siempre pida la version fresca
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// ── Sesiones ─────────────────────────────────
app.use(session({
  secret:            'electromedical-secret-2026',
  resave:            false,
  saveUninitialized: false,
  cookie:            { secure: false, httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 },
}));

// ── Rutas API ─────────────────────────────────
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/equipos',         require('./routes/equipos'));
app.use('/api/mantenimientos',  require('./routes/mantenimientos'));
app.use('/api/tickets',         require('./routes/tickets'));
app.use('/api/usuarios',        require('./routes/usuarios'));
app.use('/api/dashboard',       require('./routes/dashboard'));

// ── Help Desk público (QR sin login) ─────────
// Ruta especial: devuelve helpdesk.html para cualquier /helpdesk/*
app.get('/helpdesk/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'helpdesk.html'));
});

// ── Fallback SPA ─────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Manejo de errores global ──────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// ── Exportar para Vercel ──────────────────────
module.exports = app;

// ── Iniciar servidor local ────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║   Electromedical CMMS v2.0           ║');
    console.log(`║   http://localhost:${PORT}               ║`);
    console.log('╚══════════════════════════════════════╝');
    console.log('\n  👑 Admin:   admin@electromedical.com / Admin2026');
    console.log('  🔧 Usuario: carlos@electromedical.com / User2026');
    console.log('  🏥 Cliente: hospital@cliente.com / Cliente2026\n');
  });
}
