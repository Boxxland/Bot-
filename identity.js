// identity.js — Shared module ให้บอทตัวอื่น (D-DJ-Chinid, Skibidri, Ticket bot, ฯลฯ) require เข้าไปใช้
// เพื่อเช็คว่า Discord user คนนี้มีบัญชี Boxxland ผูกอยู่ไหม (ไม่ต้องให้ user สมัครซ้ำทุกบอท)
//
// วิธีใช้ในบอทอื่น:
//   const { getBoxxlandUser } = require('../auth-backend/identity');
//   const account = await getBoxxlandUser(message.author.id);
//   if (account) { ... account.username, account.discordTag ... }
//
require('dotenv').config();
const pool = require('./db');

/**
 * เช็คว่า Discord ID นี้ผูกกับบัญชี Boxxland อยู่ไหม
 * คืนค่า { username, discordTag, createdAt } ถ้าเจอ, null ถ้าไม่เจอ
 * (ผูกบัญชีอัตโนมัติด้วย Discord ID — ไม่ต้องให้ user ยืนยันอะไรเพิ่ม
 *  เพราะ Discord ID เดียวกันแปลว่าเป็นคนเดียวกับตอน !register)
 */
async function getBoxxlandUser(discordId) {
  if (!discordId) return null;
  try {
    const result = await pool.query(
      'SELECT username, discord_tag, created_at FROM users WHERE discord_id = $1',
      [discordId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      username: row.username,
      discordTag: row.discord_tag,
      createdAt: row.created_at,
    };
  } catch (err) {
    console.error('getBoxxlandUser error:', err);
    return null;
  }
}

/**
 * เช็คว่า Discord ID นี้มีบัญชี Boxxland หรือยัง (true/false เฉยๆ ไม่ดึงข้อมูล)
 * ใช้เร็วกว่าตอนแค่อยากรู้ว่า "ลงทะเบียนหรือยัง" โดยไม่ต้องเอาข้อมูลเต็ม
 */
async function isRegistered(discordId) {
  const user = await getBoxxlandUser(discordId);
  return user !== null;
}

module.exports = { getBoxxlandUser, isRegistered };
