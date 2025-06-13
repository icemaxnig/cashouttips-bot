// 🌐 Load environment variables
require('dotenv').config();

// 📦 Dependencies
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

// 🧠 Constants
const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE_URL = process.env.API_BASE_URL;

// 📡 Bot Initialization
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const api = axios.create({ baseURL: API_BASE_URL });

// 🧠 In-memory state
let userStates = {};

// 📖 Help Text
const helpText = `
🤖 *CashoutTips Bot Help*

🎯 /today — Free tip  
📦 /subscribe — Rollover plans  
♻️ /rollover — Today's Rollover  
🧾 /myplan — View your active plan  
🎫 /buycodes — Booking codes  
📂 /mycodes — Your purchased codes  
💰 /wallet — Wallet  
📨 /deposit — Add funds  
🧾 /referral — Your link  
💳 /withdraw — Request payout  
`;

// 🚀 Registration Flow
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userStates[chatId] = {
    step: "awaiting_email",
    telegramId: chatId,
    name: msg.from.first_name,
  };

  bot.sendMessage(chatId, "👋 Welcome to CashoutTips! Please enter your email to register.");
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const state = userStates[chatId];
  if (!state || msg.text.startsWith("/")) return;

  if (state.step === "awaiting_email") {
    state.email = msg.text.trim();
    state.step = "awaiting_password";
    bot.sendMessage(chatId, "🔐 Now enter your desired password:");
  } else if (state.step === "awaiting_password") {
    state.password = msg.text.trim();
    state.step = "registered";

    try {
      await api.post("/auth/telegram/telegram-login", {
        telegramId: state.telegramId,
        name: state.name,
        email: state.email,
        password: state.password,
      });

      bot.sendMessage(chatId, `✅ Registered successfully, ${state.name}! You're now connected to *CashoutTips Bot*`, {
        parse_mode: "Markdown",
      });

      bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
    } catch (err) {
      const message = err.response?.data?.message || "❌ Registration failed. Try again.";
      bot.sendMessage(chatId, message);
      console.error(err.message);
    }

    delete userStates[chatId]; // 🧹 Cleanup
  }
});

// ❓ Help Command
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, helpText, { parse_mode: "Markdown" });
});

// 🧩 Load Commands Modularly
const commands = [
  "wallet", "deposit", "rollover", "subscribe", "buycodes", "uploadtip", "uploadcode",
  "marktip", "markcode", "today", "referral", "myplan", "mycodes", "withdraw"
];

commands.forEach((cmd) => {
  try {
    require(`./commands/${cmd}`)(bot, api);
  } catch (e) {
    console.warn(`⚠️ Failed to load command: /${cmd}`);
  }
});

// 🚨 Polling Errors
bot.on("polling_error", (error) => {
  console.error("❌ Telegram Polling Error:", error.message);
});

console.log("✅ Telegram Bot is running...");
