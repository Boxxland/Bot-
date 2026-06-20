// db.js — เชื่อมต่อ Postgres (ใช้ร่วมกันระหว่าง api.js บน Render และ bot.js บน Termux)
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Render Postgres ต้องการ SSL
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      discord_id TEXT UNIQUE,
      discord_tag TEXT,
      created_at TIMESTAMP DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT now(),
      expires_at TIMESTAMP NOT NULL
    );
  `);
}

init().catch((err) => console.error('DB init error:', err));

module.exports = pool;
