const express = require('express');
const session = require('express-session');
const cors    = require('cors');
const path    = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lwhaqmifmdmnwbobjlsn.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_96TEtks4Hr2Y3jF4d1xSMg_amc7K6B6';

class SupabaseSessionStore extends session.Store {
  async get(sid, cb) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/session?sid=eq.${sid}&select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const rows = await r.json();
      if (!Array.isArray(rows) || !rows.length || new Date(rows[0].expire) < new Date()) {
        return cb(null, null);
      }
      cb(null, rows[0].sess);
    } catch (e) { cb(e); }
  }
  async set(sid, sess, cb) {
    try {
      const expire = new Date(Date.now() + (sess.cookie?.maxAge || 86400000)).toISOString();
      await fetch(`${SUPABASE_URL}/rest/v1/session`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({ sid, sess, expire })
      });
      cb(null);
    } catch (e) { cb(e); }
  }
  async destroy(sid, cb) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/session?sid=eq.${sid}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      cb(null);
    } catch (e) { cb(e); }
  }
  async touch(sid, sess, cb) {
    try {
      const expire = new Date(Date.now() + (sess.cookie?.maxAge || 86400000)).toISOString();
      await fetch(`${SUPABASE_URL}/rest/v1/session?sid=eq.${sid}`, {
        method: 'PATCH',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expire })
      });
      cb(null);
    } catch (e) { cb(e); }
  }
}

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

app.use(session({
  store:             new SupabaseSessionStore(),
  secret:            process.env.SESSION_SECRET || 'electromedical-secret-2026',
  resave:            true,
  saveUninitialized: true,
  cookie:            { secure: !!process.env.VERCEL, httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 },
}));

app.get('/api/health', async (req, res) => {
  try {
    const r = await fetch(`${process.env.SUPABASE_URL || 'https://lwhaqmifmdmnwbobjlsn.supabase.co'}/rest/v1/usuarios?select=id&limit=1`, {
      headers: {
        'apikey': process.env.SUPABASE_KEY || 'sb_publishable_96TEtks4Hr2Y3jF4d1xSMg_amc7K6B6',
        'Authorization': `Bearer ${process.env.SUPABASE_KEY || 'sb_publishable_96TEtks4Hr2Y3jF4d1xSMg_amc7K6B6'}`
      }
    });
    const tables = ['usuarios','equipos','mantenimientos','tickets'];
    const counts = {};
    for (const t of tables) {
      const data = await fetch(`${process.env.SUPABASE_URL || 'https://lwhaqmifmdmnwbobjlsn.supabase.co'}/rest/v1/${t}?select=id&limit=1000`, {
        headers: {
          'apikey': process.env.SUPABASE_KEY || 'sb_publishable_96TEtks4Hr2Y3jF4d1xSMg_amc7K6B6',
          'Authorization': `Bearer ${process.env.SUPABASE_KEY || 'sb_publishable_96TEtks4Hr2Y3jF4d1xSMg_amc7K6B6'}`
        }
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
