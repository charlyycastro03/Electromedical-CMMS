const express = require('express');
const session = require('express-session');
const cors    = require('cors');
const path    = require('path');
const { pool } = require('./utils/db');
const pgSession = require('connect-pg-simple')(session);

const app  = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
  console.error('ERROR: Falta DATABASE_URL en variables de entorno');
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new pgSession({ pool, tableName: 'session' }),
  secret:            process.env.SESSION_SECRET || 'electromedical-secret-2026',
  resave:            false,
  saveUninitialized: false,
  cookie:            { secure: !!process.env.VERCEL, httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 },
}));

app.use('/api/auth',            require('./routes/auth'));
app.use('/api/equipos',         require('./routes/equipos'));
app.use('/api/mantenimientos',  require('./routes/mantenimientos'));
app.use('/api/tickets',         require('./routes/tickets'));
app.use('/api/usuarios',        require('./routes/usuarios'));
app.use('/api/dashboard',       require('./routes/dashboard'));

app.get('/helpdesk/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'helpdesk.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('\n Electromedical CMMS v2.0');
    console.log(` http://localhost:${PORT}`);
    console.log('\n Admin:   admin@electromedical.com / Admin2026');
    console.log(' Usuario: carlos@electromedical.com / User2026');
    console.log(' Cliente: hospital@cliente.com / Cliente2026\n');
  });
}
