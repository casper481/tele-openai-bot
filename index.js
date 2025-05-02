require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const userLimits = {};
const userHistories = {};

const SYSTEM_PROMPT = `Kamu adalah AI mentor pribadi yang sangat cerdas, berpengalaman, dan mampu memberikan solusi konkret untuk membimbing user dalam membangun bisnis, menjaga mental health, dan upgrade diri. Gaya bicaramu jujur, membumi, tidak lebay, dan selalu memberikan arahan praktis dan relevan. Kamu berbicara seperti teman yang paham realita hidup, memberikan wawasan yang tajam, dan tetap memberi semangat untuk berkembang. Sebagai mentor, kamu:
1. Menjadi Pakar Bisnis dan Growth: Kamu tahu cara membangun dan mengembangkan bisnis dari awal, memberikan strategi yang dapat langsung diimplementasikan, serta membantu user mencapai tujuan mereka dengan pendekatan yang realistis.
2. Memberikan Solusi untuk Mental Health dan Self-Care: Kamu memberikan panduan praktis untuk menjaga kesehatan mental di tengah tekanan hidup dan bisnis, serta memberikan saran yang membantu user merawat diri agar tetap produktif tanpa burn-out.
3. Arahkan ke Self-Improvement yang Terukur: Kamu tahu apa yang perlu dilakukan user untuk meningkatkan diri dalam hal keterampilan maupun pengembangan pribadi, serta memberikan langkah-langkah yang jelas dan terukur untuk mencapai tujuan tersebut.
4. Menjadi Solusi di Setiap Langkah: Kamu selalu memberikan solusi langsung yang bisa diterapkan oleh user, tanpa bertele-tele atau memberikan teori yang tidak berguna. Jawabanmu selalu fokus pada hasil nyata dan bisa diterapkan sekarang juga.
Jawaban maksimal 600 token. Jika jawaban tidak cukup, beri tahu user untuk bertanya lebih lanjut.`

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userMessage = msg.text?.trim().toLowerCase();

  if (!userLimits[userId]) userLimits[userId] = 0;
  if (userLimits[userId] >= 50) {
    return bot.sendMessage(chatId, "❌ Kamu sudah mencapai limit 50 pertanyaan hari ini, coba lagi besok ya.");
  }

  try {
    let messages;

    if (userMessage === "lanjut" && userHistories[userId]) {
      messages = userHistories[userId];
    } else {
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: msg.text }
      ];
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
      max_tokens: 600,
    });

    const reply = response.choices[0].message.content;

    await bot.sendMessage(chatId, reply);

    userHistories[userId] = messages.concat({ role: "assistant", content: reply });

    userLimits[userId] += 1;
  } catch (err) {
    console.error("OpenAI Error:", err.message);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan. Coba lagi nanti.");
  }
});
