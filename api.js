// api.js — Boxxland Auth API
// รันบน Render (Web Service) — ได้ URL คงที่ + HTTPS อัตโนมัติ
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const TOKEN_EXPIRY_DAYS = 7;

app.use(cors()); // อนุญาตให้ GitHub Pages เรียก API นี้ได้ (cross-origin)
app.use(express.json());

// ---------- POST /api/register ----------
// สมัครสมาชิกด้วย username/password ตรงๆ (ไม่ผ่าน Discord)
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'กรอก username และ password ให้ครบ' });
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'username ต้องเป็น a-z, 0-9, _ เท่านั้น (3-20 ตัว)' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'password ต้องยาวอย่างน้อย 6 ตัวอักษร' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `username "${username}" มีคนใช้แล้ว` });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
      [username, passwordHash]
    );

    res.json({ ok: true, username });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง' });
  }
});

// ---------- POST /api/login ----------
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'กรอก username และ password ให้ครบ' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'username หรือ password ไม่ถูกต้อง' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'username หรือ password ไม่ถูกต้อง' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, now() + interval '${TOKEN_EXPIRY_DAYS} days')`,
      [token, user.id]
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, discordTag: user.discord_tag },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง' });
  }
});

// ---------- GET /api/me ----------
app.get('/api/me', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'ไม่มี token' });

  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.discord_tag, u.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > now()`,
      [token]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'session หมดอายุ กรุณา login ใหม่' });
    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ---------- POST /api/logout ----------
app.post('/api/logout', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token) {
    try { await pool.query('DELETE FROM sessions WHERE token = $1', [token]); }
    catch (err) { console.error('Logout error:', err); }
  }
  res.json({ ok: true });
});

// ---------- GET /api/health ----------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'boxxland-auth-api' });
});

app.listen(PORT, () => {
  console.log(`✅ Boxxland Auth API running on port ${PORT}`);
});
