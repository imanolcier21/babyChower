const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Page routes ──────────────────────────────────────────────────
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/invite/:token', (req, res) => res.sendFile(path.join(__dirname, 'public', 'invite.html')));

// ── Admin auth middleware ─────────────────────────────────────────
function adminAuth(req, res, next) {
  const pw = req.headers['x-admin-password'];
  const stored = db.prepare("SELECT value FROM settings WHERE key='admin_password'").get();
  if (!pw || pw !== stored.value) return res.status(401).json({ error: 'No autorizado' });
  next();
}

// ── Public API ────────────────────────────────────────────────────
app.get('/api/invite/:token', (req, res) => {
  const guest = db.prepare(
    'SELECT id, name, max_guests, confirmed, confirmed_at FROM guests WHERE token = ?'
  ).get(req.params.token);
  if (!guest) return res.status(404).json({ error: 'Invitación no encontrada' });
  res.json(guest);
});

// Search guests by name (for main page RSVP)
app.get('/api/search', (req, res) => {
  const { name } = req.query;
  if (!name || name.trim().length < 2) return res.json([]);
  const results = db.prepare(
    `SELECT name, max_guests, confirmed, confirmed_at, token
     FROM guests WHERE name LIKE ? ORDER BY name ASC LIMIT 8`
  ).all(`%${name.trim()}%`);
  res.json(results);
});

app.post('/api/rsvp/:token', (req, res) => {
  const guest = db.prepare('SELECT * FROM guests WHERE token = ?').get(req.params.token);
  if (!guest) return res.status(404).json({ error: 'Invitación no encontrada' });
  const num = parseInt(req.body.confirmed);
  if (isNaN(num) || num < 0 || num > guest.max_guests)
    return res.status(400).json({ error: `Solo puedes confirmar entre 0 y ${guest.max_guests} personas` });
  db.prepare('UPDATE guests SET confirmed=?, confirmed_at=CURRENT_TIMESTAMP WHERE token=?').run(num, req.params.token);
  
  // Enviar notificación a Telegram
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (botToken && chatId) {
      const totalConfirmed = db.prepare('SELECT COALESCE(SUM(confirmed),0) as s FROM guests WHERE confirmed IS NOT NULL').get().s;
      const text = `🔔 *¡Nueva Confirmación!*\n\nConfirmó *${guest.name}* con *${num}* lugares.\n\n📊 *Resumen actual:*\nLlevas *${totalConfirmed}* confirmados de un límite de *100*.\n\n_(Recuerda que si superas el límite debes solicitar otra mesa)_`;
      
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
      }).catch(err => console.error("Error enviando Telegram:", err));
    }
  } catch (err) {
    console.error("Error en bloque Telegram:", err);
  }

  res.json({ success: true, confirmed: num });
});

// ── Admin API ─────────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const stored = db.prepare("SELECT value FROM settings WHERE key='admin_password'").get();
  if (req.body.password !== stored.value) return res.status(401).json({ error: 'Contraseña incorrecta' });
  res.json({ success: true });
});

app.get('/api/admin/stats', adminAuth, (req, res) => {
  const totalGuests    = db.prepare('SELECT COUNT(*) as c FROM guests').get().c;
  const responded      = db.prepare('SELECT COUNT(*) as c FROM guests WHERE confirmed IS NOT NULL').get().c;
  const totalSlots     = db.prepare('SELECT COALESCE(SUM(max_guests),0) as s FROM guests WHERE confirmed IS NULL OR confirmed > 0').get().s;
  const confirmedSlots = db.prepare('SELECT COALESCE(SUM(confirmed),0) as s FROM guests WHERE confirmed IS NOT NULL').get().s;
  res.json({ totalGuests, responded, notResponded: totalGuests - responded, totalSlots, confirmedSlots });
});

app.get('/api/admin/guests', adminAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM guests ORDER BY name ASC').all());
});

app.post('/api/admin/guests', adminAuth, (req, res) => {
  const { name, phone, max_guests, notes, host } = req.body;
  if (!name || !max_guests) return res.status(400).json({ error: 'Nombre y cupo son requeridos' });
  const token = uuidv4();
  const result = db.prepare(
    'INSERT INTO guests (name, phone, max_guests, token, notes, host) VALUES (?,?,?,?,?,?)'
  ).run(name.trim(), phone?.trim() || null, parseInt(max_guests), token, notes?.trim() || null, host || 'Ambos');
  res.status(201).json(db.prepare('SELECT * FROM guests WHERE id=?').get(result.lastInsertRowid));
});

app.put('/api/admin/guests/:id', adminAuth, (req, res) => {
  const { name, phone, max_guests, notes, host } = req.body;
  const g = db.prepare('SELECT * FROM guests WHERE id=?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('UPDATE guests SET name=?,phone=?,max_guests=?,notes=?,host=? WHERE id=?')
    .run(name?.trim() || g.name, phone?.trim() || null, parseInt(max_guests) || g.max_guests, notes?.trim() || null, host || g.host || 'Ambos', req.params.id);
  res.json(db.prepare('SELECT * FROM guests WHERE id=?').get(req.params.id));
});

app.delete('/api/admin/guests/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM guests WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/admin/guests/:id/reset', adminAuth, (req, res) => {
  db.prepare('UPDATE guests SET confirmed=NULL, confirmed_at=NULL WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/settings', adminAuth, (req, res) => {
  const baseUrl = db.prepare("SELECT value FROM settings WHERE key='base_url'").get();
  res.json({ base_url: baseUrl?.value || '' });
});

app.put('/api/admin/settings', adminAuth, (req, res) => {
  const { base_url, new_password } = req.body;
  if (base_url !== undefined)
    db.prepare("UPDATE settings SET value=? WHERE key='base_url'").run(base_url.trim());
  if (new_password && new_password.length >= 6)
    db.prepare("UPDATE settings SET value=? WHERE key='admin_password'").run(new_password);
  res.json({ success: true });
});

app.get('/api/server-info', (req, res) => {
  const ips = [];
  Object.values(os.networkInterfaces()).forEach(iface => {
    iface?.forEach(d => { if (d.family === 'IPv4' && !d.internal) ips.push(d.address); });
  });
  res.json({ ips, port: PORT });
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const ips = [];
  Object.values(os.networkInterfaces()).forEach(iface => {
    iface?.forEach(d => { if (d.family === 'IPv4' && !d.internal) ips.push(d.address); });
  });
  console.log('\n🍯 ══════════════════════════════════════════');
  console.log('   Baby Shower · Lucca ✨');
  console.log('════════════════════════════════════════════');
  console.log(`   Local:    http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`   Red WiFi: http://${ip}:${PORT}`));
  console.log(`   Admin:    http://localhost:${PORT}/admin`);
  console.log(`   Password: babychower2026`);
  console.log('════════════════════════════════════════════\n');
});
