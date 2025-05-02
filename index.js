require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const userLimits = {};

function checkLimit(userId) {
  const now = Date.now();

  if (!userLimits[userId]) {
    userLimits[userId] = { count: 1, lastReset: now };
    return true;
  }

  const { count, lastReset } = userLimits[userId];
  const diff = now - lastReset;

  if (diff > 24 * 60 * 60 * 1000) {
    userLimits[userId] = { count: 1, lastReset: now };
    return true;
  }

  if (count >= 50) return false;

  userLimits[userId].count += 1;
  return true;
}

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

  if (!checkLimit(userId)) {
    return bot.sendMessage(chatId, "❌ Kamu sudah mencapai limit 50 pertanyaan hari ini. Coba lagi besok ya.");
  }

  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userText }
    ];

    const finalReply = await getFullReply(messages);
    await bot.sendMessage(chatId, finalReply);

  } catch (err) {
    bot.sendMessage(chatId, "❌ Terjadi kesalahan. Coba lagi nanti.");
  }
});
