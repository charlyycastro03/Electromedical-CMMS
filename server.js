const express = require('express');
const cors    = require('cors');
const path    = require('path');
const jwt     = require('./utils/jwt');

const app  = express();
const PORT = process.env.PORT || 3000;

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

// JWT middleware: hace req.usuario disponible si hay token válido
app.use((req, res, next) => {
  const usuario = jwt.obtenerUsuarioDeToken(req);
  if (usuario) req.usuario = usuario;
  next();
});

app.get('/api/health', async (req, res) => {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lwhaqmifmdmnwbobjlsn.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_96TEtks4Hr2Y3jF4d1xSMg_amc7K6B6';
    const r = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?select=id&limit=1`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const tables = ['usuarios','equipos','mantenimientos','tickets'];
    const counts = {};
    for (const t of tables) {
      const data = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=id&limit=1000`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const rows = await data.json();
      counts[t] = Array.isArray(rows) ? rows.length : 0;
    }
    res.json({ db: r.ok, tables: counts, env: { SUPABASE_URL: !!process.env.SUPABASE_URL, SUPABASE_KEY: !!process.env.SUPABASE_KEY, VERCEL: !!process.env.VERCEL } });
  } catch (e) {
    res.json({ db: false, error: e.message, env: { SUPABASE_URL: !!process.env.SUPABASE_URL, SUPABASE_KEY: !!process.env.SUPABASE_KEY, VERCEL: !!process.env.VERCEL } });
  }
});

app.use('/api/auth',            require('./routes/auth'));
app.use('/api/equipos',         require('./routes/equipos'));
app.use('/api/mantenimientos',  require('./routes/mantenimientos'));
app.use('/api/tickets',         require('./routes/tickets'));
app.use('/api/usuarios',        require('./routes/usuarios'));
app.use('/api/dashboard',       require('./routes/dashboard'));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Electromedical CMMS v3.0 · JWT Auth · Puerto ${PORT}`));
