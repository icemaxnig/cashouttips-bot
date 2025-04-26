require('dotenv').config();
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(bodyParser.json());

// Database arrays
let users = [];
const userChoices = {};
const premiumCodes = [];
const superAdminId = "7303124996"; // YOUR Telegram ID
const roles = { "7303124996": "admin" };

// BOT Setup
const token = process.env.BOT_TOKEN; // Use environment variable
const bot = new TelegramBot(token, { polling: true });

// Promote Admin Command
bot.onText(/\/promote (.+)/, (msg, match) => {
  const chatId = msg.chat.id.toString();
  const targetId = match[1].trim();
  if (chatId !== superAdminId) {
    bot.sendMessage(chatId, "🚫 Only Super Admin can promote users.");
    return;
  }
  roles[targetId] = "admin";
  bot.sendMessage(chatId, `✅ User with ID ${targetId} promoted to Admin.`);
});

// Demote Admin Command
bot.onText(/\/demote (.+)/, (msg, match) => {
  const chatId = msg.chat.id.toString();
  const targetId = match[1].trim();
  if (chatId !== superAdminId) {
    bot.sendMessage(chatId, "🚫 Only Super Admin can demote users.");
    return;
  }
  if (roles[targetId]) {
    delete roles[targetId];
    bot.sendMessage(chatId, `✅ User with ID ${targetId} demoted successfully.`);
  } else {
    bot.sendMessage(chatId, `❌ User with ID ${targetId} is not an Admin.`);
  }
});

// Upload Booking Code Command
bot.onText(/\/uploadcode/, (msg) => {
  const chatId = msg.chat.id.toString();
  if (roles[chatId] !== "admin") {
    bot.sendMessage(chatId, "🚫 You don't have permission to upload codes.");
    return;
  }
  userChoices[chatId] = { stage: 'upload_odds' };
  bot.sendMessage(chatId, "🆕 Enter the Odds Range (e.g., 5–10 Odds):");
});

// Handle Messages for Uploading and Others
bot.on('message', async (msg) => {
  const chatId = msg.chat.id.toString();
  const text = msg.text.trim();

  if (userChoices[chatId]) {
    const upload = userChoices[chatId];

    if (upload.stage === 'upload_odds') {
      upload.oddsRange = text;
      upload.stage = 'upload_winrate';
      bot.sendMessage(chatId, "✅ Enter the Winning Rate (e.g., 85%):");
    }
    else if (upload.stage === 'upload_winrate') {
      upload.winRate = text;
      upload.stage = 'upload_price';
      bot.sendMessage(chatId, "✅ Enter the Price (in Naira, e.g., 2000):");
    }
    else if (upload.stage === 'upload_price') {
      upload.price = parseInt(text);
      upload.stage = 'upload_bookmaker';
      bot.sendMessage(chatId, "✅ Enter the Bookmaker Name (e.g., SportyBet):");
    }
    else if (upload.stage === 'upload_bookmaker') {
      upload.bookmaker = text;
      upload.stage = 'upload_logo';
      bot.sendMessage(chatId, "✅ Enter the Logo Image URL:");
    }
    else if (upload.stage === 'upload_logo') {
      upload.logo = text;
      upload.stage = 'upload_code';
      bot.sendMessage(chatId, "✅ Enter the Booking Code:");
    }
    else if (upload.stage === 'upload_code') {
      upload.code = text;
      upload.stage = 'upload_expiry';
      bot.sendMessage(chatId, "✅ Enter Last Match Start Time (e.g., 2024-06-10T20:30:00):");
    }
    else if (upload.stage === 'upload_expiry') {
      upload.expiryTime = text;

      premiumCodes.push({
        oddsRange: upload.oddsRange,
        winRate: upload.winRate,
        price: upload.price,
        bookmaker: upload.bookmaker,
        logo: upload.logo,
        code: upload.code,
        expiryTime: upload.expiryTime
      });

      delete userChoices[chatId];
      bot.sendMessage(chatId, "🎯 Booking Code Successfully Uploaded with Expiry Time!");
    }

    return;
  }
});

// Auto-delete expired premium codes every 5 minutes
cron.schedule('*/5 * * * *', () => {
  const now = new Date();
  const initialLength = premiumCodes.length;

  for (let i = premiumCodes.length - 1; i >= 0; i--) {
    if (premiumCodes[i].expiryTime && new Date(premiumCodes[i].expiryTime) <= now) {
      premiumCodes.splice(i, 1);
    }
  }

  if (initialLength !== premiumCodes.length) {
    console.log(`🗑️ Auto-deleted expired premium codes at ${now.toISOString()}`);
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
