// ===== ตัวอย่าง: เอาไปแปะในบอทอื่น (เช่น D-DJ-Chinid) =====
// นี่ไม่ใช่ไฟล์ที่ต้องรัน — เป็นตัวอย่างโค้ดให้ copy เฉพาะส่วนที่ต้องใช้
// ไปแปะในไฟล์ index.js (หรือไฟล์หลัก) ของบอทตัวอื่น

// 1) ต้องแก้ path ให้ตรงกับตำแหน่งจริงที่ clone โฟลเดอร์ auth-backend ไว้บน Termux
//    เช่น ถ้า D-DJ-Chinid อยู่ที่ ~/d-dj-chinid และ auth-backend อยู่ที่ ~/auth-backend
//    path จะเป็น '../auth-backend/identity'
const { getBoxxlandUser } = require('../auth-backend/identity');

// 2) ตัวอย่างใช้งานตอนมีคำสั่งในบอท เช่น !profile หรือ !balance
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.content !== '!profile') return;

  const account = await getBoxxlandUser(msg.author.id);

  if (!account) {
    return msg.reply(
      '⚠️ คุณยังไม่มีบัญชี Boxxland — พิมพ์ `!register username` เพื่อสมัครก่อนนะ'
    );
  }

  // เจอบัญชีแล้ว ใช้ account.username ได้เลย (ไม่ต้องให้ user สมัครซ้ำในบอทนี้)
  return msg.reply(
    `👤 บัญชี Boxxland ของคุณ: \`${account.username}\`\n` +
    `📅 สมัครเมื่อ: ${new Date(account.createdAt).toLocaleDateString('th-TH')}`
  );
});

// 3) อีกตัวอย่าง — เช็คแบบ true/false เฉยๆ ก่อนให้สิทธิ์ใช้ฟีเจอร์
//    const { isRegistered } = require('../auth-backend/identity');
//    const ok = await isRegistered(msg.author.id);
//    if (!ok) return msg.reply('ต้องสมัคร Boxxland ก่อนถึงจะเล่นหุ้นได้นะ');
