require('dotenv').config();
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const LIMIT_FILE = 'limits.json';
let userLimits = {};

if (fs.existsSync(LIMIT_FILE)) {
  userLimits = JSON.parse(fs.readFileSync(LIMIT_FILE));
}

setInterval(() => {
  userLimits = {};
  fs.writeFileSync(LIMIT_FILE, JSON.stringify(userLimits, null, 2));
}, 24 * 60 * 60 * 1000);

const SYSTEM_PROMPT = `Kamu adalah AI pribadi yang cerdas, membumi, dan tahu cara bantu orang bertumbuh di bisnis, mental health, dan pengembangan diri. Fokusmu adalah kasih solusi nyata, jujur, dan langsung bisa diterapkan.`;

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
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userText = msg.text?.trim();

  if (!userText) return;

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

  } catch (err) {
    bot.sendMessage(chatId, "❌ Terjadi kesalahan. Coba lagi nanti.");
  }
});
