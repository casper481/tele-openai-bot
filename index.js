require('dotenv').config();
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const LIMIT_FILE = 'limits.json';
let userLimits = {};

if (fs.existsSync(LIMIT_FILE)) {
  try {
    userLimits = JSON.parse(fs.readFileSync(LIMIT_FILE));
  } catch {
    userLimits = {};
  }
} else {
  fs.writeFileSync(LIMIT_FILE, JSON.stringify({}));
}

setInterval(() => {
  userLimits = {};
  fs.writeFileSync(LIMIT_FILE, JSON.stringify(userLimits, null, 2));
}, 24 * 60 * 60 * 1000);

const SYSTEM_PROMPT = `Kamu adalah AI mentor pribadi yang sangat cerdas, berpengalaman, dan mampu memberikan solusi konkret untuk membimbing user dalam membangun bisnis, menjaga mental health, dan upgrade diri. Gaya bicaramu jujur, membumi, tidak lebay, dan selalu memberikan arahan praktis dan relevan. Kamu berbicara seperti teman yang paham realita hidup, memberikan wawasan yang tajam, dan tetap memberi semangat untuk berkembang. Sebagai mentor, kamu:
1. Menjadi Pakar Bisnis dan Growth: Memberi strategi yang bisa langsung dijalankan user secara realistis.
2. Memberikan Solusi untuk Mental Health: Bantu user tetap sehat mental saat menghadapi tekanan hidup & bisnis.
3. Arahkan ke Self-Improvement yang Terukur: Berikan langkah jelas agar user bisa berkembang secara nyata.
4. Selalu Fokus pada Solusi: Jawabanmu tidak bertele-tele, langsung bisa diterapkan hari ini juga.`;

async function getFullReply(messages) {
  let fullReply = "";
  let stop = false;

  while (!stop) {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
      max_tokens: 600,
    });

    const reply = response.choices[0].message.content;
    fullReply += reply;
    messages.push({ role: "assistant", content: reply });
    stop = !reply.trim().endsWith(':') && !reply.trim().endsWith('...');
  }

  return fullReply;
}

bot.on('message', async (msg) => {
  if (msg.chat.type !== 'private') return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userText = msg.text?.trim();

  if (!userText) return;

  try {
    userLimits = JSON.parse(fs.readFileSync(LIMIT_FILE));
  } catch {
    userLimits = {};
  }

  if (!userLimits[userId]) userLimits[userId] = 0;

  if (userLimits[userId] >= 50) {
    return bot.sendMessage(chatId, "❌ Kamu sudah mencapai limit 50 pertanyaan hari ini. Coba lagi besok ya.");
  }

  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userText }
    ];

    const finalReply = await getFullReply(messages);
    await bot.sendMessage(chatId, finalReply);

    userLimits[userId] += 1;
    fs.writeFileSync(LIMIT_FILE, JSON.stringify(userLimits, null, 2));

  } catch {
    bot.sendMessage(chatId, "❌ Terjadi kesalahan. Coba lagi nanti.");
  }
});
