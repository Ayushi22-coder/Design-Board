// ============================================================
// Design Board – Backend Server
// ============================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();

app.use(express.json());
app.use(cors());

// ============================================================
// File Storage
// ============================================================

const DB_FILE = path.join(__dirname, 'inquiries.json');

function loadInquiries() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (error) {
    console.log('Error loading inquiries:', error);
  }

  return [];
}

function saveInquiries(list) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(list, null, 2),
    'utf8'
  );
}

let inquiries = loadInquiries();

let idCounter =
  inquiries.length > 0
    ? Math.max(...inquiries.map(i => i.id)) + 1
    : 1;

// ============================================================
// ENV VARIABLES
// ============================================================

const PORT = process.env.PORT || 3000;

const ADMIN_USER =
  process.env.ADMIN_USERNAME || 'admin';

const ADMIN_PASS =
  process.env.ADMIN_PASSWORD || 'admin123';

const JWT_SECRET =
  process.env.JWT_SECRET || 'secret-key';

// ============================================================
// EMAIL CONFIG
// ============================================================

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify Gmail Connection
transporter.verify((error, success) => {

  if (error) {
    console.log('❌ Gmail Error:', error);
  } else {
    console.log('✅ Gmail SMTP Connected');
  }

});

// ============================================================
// TOKEN HELPERS
// ============================================================

function makeToken(user) {

  const payload = Buffer.from(
    JSON.stringify({
      user,
      exp: Date.now() + 8 * 60 * 60 * 1000
    })
  ).toString('base64');

  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 16);

  return payload + '.' + sig;
}

function verifyToken(token) {

  try {

    const [payload, sig] = token.split('.');

    const expected = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(payload)
      .digest('hex')
      .slice(0, 16);

    if (sig !== expected) return null;

    const data = JSON.parse(
      Buffer.from(payload, 'base64').toString()
    );

    if (data.exp < Date.now()) return null;

    return data;

  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {

  const h = req.headers.authorization || '';

  const token = h.startsWith('Bearer ')
    ? h.slice(7)
    : '';

  if (!verifyToken(token)) {
    return res.status(401).json({
      error: 'Unauthorized'
    });
  }

  next();
}

// ============================================================
// LOGIN ROUTE
// ============================================================

app.post('/api/auth/login', (req, res) => {

  const { username, password } = req.body || {};

  if (
    username === ADMIN_USER &&
    password === ADMIN_PASS
  ) {

    console.log(
      `[LOGIN] ${username} logged in`
    );

    return res.json({
      token: makeToken(username),
      message: 'Login successful'
    });
  }

  res.status(401).json({
    error: 'Invalid credentials'
  });
});

// ============================================================
// INQUIRY ROUTE
// ============================================================

app.post('/api/inquiry', async (req, res) => {

  try {

    const {
      name,
      email,
      phone,
      projectType,
      message
    } = req.body || {};

    // Validation
    if (
      !name ||
      !email ||
      !projectType ||
      !message
    ) {

      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Inquiry Object
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

    // Save Inquiry
    inquiries.push(inquiry);

    saveInquiries(inquiries);

    console.log(`\n✅ NEW INQUIRY #${inquiry.id}`);

    // ========================================================
    // SEND EMAIL
    // ========================================================

    const mailOptions = {

      from: process.env.EMAIL_USER,

      to: process.env.EMAIL_TO,

      subject:
        `New Inquiry from ${inquiry.name}`,

      html: `
        <div style="font-family: Arial; padding:20px;">

          <h2>New Inquiry Received</h2>

          <p>
            <strong>Name:</strong>
            ${inquiry.name}
          </p>

          <p>
            <strong>Email:</strong>
            ${inquiry.email}
          </p>

          <p>
            <strong>Phone:</strong>
            ${inquiry.phone}
          </p>

          <p>
            <strong>Project Type:</strong>
            ${inquiry.projectType}
          </p>

          <p>
            <strong>Message:</strong>
          </p>

          <p>
            ${inquiry.message}
          </p>

          <hr>

          <p>
            Sent from Design Board Website
          </p>

        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    console.log('✅ Email Sent Successfully');

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully',
      id: inquiry.id
    });

  } catch (error) {

    console.log('❌ Inquiry Error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  }

});

// ============================================================
// GET INQUIRIES
// ============================================================

app.get('/api/inquiries', requireAuth, (req, res) => {
  res.json(inquiries);
});

// ============================================================
// DELETE INQUIRY
// ============================================================

app.delete('/api/inquiry/:id', requireAuth, (req, res) => {

  const id = parseInt(req.params.id);

  inquiries =
    inquiries.filter(i => i.id !== id);

  saveInquiries(inquiries);

  res.json({
    success: true
  });

});

// ============================================================
// STATUS
// ============================================================

app.get('/api/status', (req, res) => {

  res.json({
    status: 'running',
    inquiries: inquiries.length
  });

});

// ============================================================
// FRONTEND
// ============================================================

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {

  res.sendFile(
    path.join(__dirname, 'index.html')
  );

});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {

  console.log('\n===================================');
  console.log(' Design Board Server Running ');
  console.log('===================================');

  console.log(
    `🌐 URL: http://localhost:${PORT}`
  );

  console.log(
    `📩 Loaded Inquiries: ${inquiries.length}`
  );

  console.log('===================================\n');

});