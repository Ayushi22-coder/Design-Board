// ============================================================
//  Design Board – Backend Server
//  Node.js + Express | SQLite database
//  Run: npm install && node server.js
//  Visit: http://localhost:3001
// ============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors({ origin: ['http://localhost:3000', 'https://www.designboard.co.in'] }));

// ── Serve static files ──────────────────────────────────────
app.use(express.static(path.join(__dirname, '.')));

// ── Simple in-memory store (replace with DB in production) ──
let inquiries = [];
let idCounter = 1;

// ── CONFIG ──────────────────────────────────────────────────
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'designboard2024'; // CHANGE THIS before going live!
const JWT_SECRET = 'db-secret-key-change-in-production';

// Simple JWT-like token (base64 encoded)
function makeToken(user) {
  const payload = Buffer.from(JSON.stringify({ user, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex').slice(0, 16);
  return payload + '.' + sig;
}
function verifyToken(token) {
  try {
    const [payload, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex').slice(0, 16);
    if (sig !== expected) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64').toString());
    if (data.exp < Date.now()) return null;
    return data;
  } catch { return null; }
}
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── ROUTES ──────────────────────────────────────────────────

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.json({ token: makeToken(username), message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// POST /api/inquiry  — submit new inquiry
app.post('/api/inquiry', (req, res) => {
  const { name, email, phone, projectType, message } = req.body;
  if (!name || !email || !message || !projectType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const inquiry = {
    id: idCounter++,
    name: name.trim(),
    email: email.trim(),
    phone: (phone || '').trim(),
    projectType,
    message: message.trim(),
    createdAt: new Date().toISOString(),
    status: 'new'
  };
  inquiries.push(inquiry);
  console.log(`[${inquiry.createdAt}] New inquiry from ${inquiry.name} (${inquiry.email}) — ${inquiry.projectType}`);
  res.status(201).json({ success: true, id: inquiry.id, message: 'Inquiry received' });
});

// GET /api/inquiries  — list all (admin only)
app.get('/api/inquiries', auth, (req, res) => {
  res.json(inquiries);
});

// DELETE /api/inquiry/:id  — delete (admin only)
app.delete('/api/inquiry/:id', auth, (req, res) => {
  const id = parseInt(req.params.id);
  inquiries = inquiries.filter(i => i.id !== id);
  res.json({ success: true });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── START ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('\n===========================================');
  console.log('  Design Board Server Running');
  console.log(`  http://localhost:${PORT}`);
  console.log('  Admin: admin / designboard2024');
  console.log('  CHANGE PASSWORD before going live!');
  console.log('===========================================\n');
});