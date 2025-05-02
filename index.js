require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { Configuration, OpenAIApi } = require('openai');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const userData = {};

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Batasi jumlah pertanyaan per user
  if (!userData[chatId]) {
    userData[chatId] = { count: 0 };
  }

  if (userData[chatId].count >= 50) {
    bot.sendMessage(chatId, '❌ Kamu sudah mencapai batas maksimal 50 pertanyaan.');
    return;
  }

  // Tambahkan hitungan
  userData[chatId].count++;

  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: text }],
      max_tokens: 1000,
    });

    const reply = completion.data.choices[0].message.content;
    bot.sendMessage(chatId, reply);
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '❌ Maaf, terjadi error saat memproses pertanyaanmu.');
  }
});
