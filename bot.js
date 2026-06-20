// bot.js — Boxxland Auth Bot (รันบน Termux)
// คำสั่ง: !register <username>
// บอทสุ่ม password, hash เก็บลง Postgres (DB เดียวกับ Render), แล้ว DM password ไปให้ user
require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('./db');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel], // จำเป็นสำหรับการ DM
});

function generatePassword() {
  return 'bxl-' + crypto.randomBytes(5).toString('hex');
}

client.once('ready', () => {
  console.log(`✅ Boxxland Auth Bot online: ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith('!register')) return;

  const args = msg.content.trim().split(/\s+/);
  const username = args[1];

  if (!username) {
    return msg.reply('⚠️ ใช้แบบนี้นะ: `!register ชื่อที่ต้องการ`\nเช่น `!register moodeng`');
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return msg.reply('⚠️ username ต้องเป็นตัวอักษร a-z, 0-9, _ เท่านั้น (3-20 ตัวอักษร)');
  }

  try {
    // เช็คว่า discord account นี้สมัครไปแล้วหรือยัง
    const existingByDiscord = await pool.query('SELECT * FROM users WHERE discord_id = $1', [msg.author.id]);
    if (existingByDiscord.rows.length > 0) {
      return msg.reply(`⚠️ บัญชี Discord นี้ลงทะเบียนไว้แล้วในชื่อ \`${existingByDiscord.rows[0].username}\``);
    }

    // เช็คว่า username ซ้ำไหม
    const existingByUsername = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existingByUsername.rows.length > 0) {
      return msg.reply(`⚠️ username \`${username}\` มีคนใช้แล้ว ลองชื่ออื่นนะ`);
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (username, password_hash, discord_id, discord_tag) VALUES ($1, $2, $3, $4)',
      [username, passwordHash, msg.author.id, msg.author.tag]
    );

    // DM password ให้ user
    try {
      await msg.author.send(
        `🎉 **ลงทะเบียน Boxxland สำเร็จ!**\n\n` +
        `👤 Username: \`${username}\`\n` +
        `🔑 Password: \`${password}\`\n\n` +
        `เก็บ password นี้ไว้ดีๆ นะ ใช้ login ที่เว็บ Boxxland ได้เลย\n` +
        `🌐 https://boxxland.github.io/Hi/`
      );
      await msg.reply(`✅ ${msg.author}, ลงทะเบียนสำเร็จ! เช็ค DM เพื่อรับ password นะ 📩`);
    } catch (dmErr) {
      // DM ไม่ได้ (ปิด DM ไว้) — ลบ user ที่เพิ่งสร้างทิ้ง กันบัญชีค้างไม่มี password ส่งไปให้
      await pool.query('DELETE FROM users WHERE username = $1', [username]);
      return msg.reply(
        `⚠️ ส่ง DM ไม่ได้ (คุณอาจปิดรับ DM จากสมาชิกเซิร์ฟไว้)\n` +
        `กรุณาเปิดรับ DM แล้วลองสั่ง \`!register ${username}\` ใหม่อีกครั้ง`
      );
    }
  } catch (err) {
    console.error('Register error:', err);
    return msg.reply('❌ เกิดข้อผิดพลาด ลองอีกครั้งนะ');
  }
});

client.login(process.env.DISCORD_TOKEN);
