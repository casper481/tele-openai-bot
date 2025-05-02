require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const userLimits = {};

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!userLimits[userId]) userLimits[userId] = 0;
  if (userLimits[userId] >= 50) {
    return bot.sendMessage(chatId, "❌ Kamu sudah mencapai limit 50 pertanyaan hari ini, coba lagi besok ya.");
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: msg.text }],
      max_tokens: 1000,
    });

    const reply = response.choices[0].message.content;
    await bot.sendMessage(chatId, reply);
    userLimits[userId] += 1;
  } catch (err) {
    console.error("OpenAI Error:", err.message);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan. Coba lagi nanti.");
  }
});
