// Load environment variables from .env file
require('dotenv').config();

const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8080;  // Use port 8080 for Railway or local

// Use body-parser middleware to parse JSON requests
app.use(bodyParser.json());

// Log the bot token (for debugging purposes, remove this after testing)
console.log('Bot Token:', process.env.BOT_TOKEN);

// Ensure the BOT_TOKEN is available in the environment variables
if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing from the .env file');
  process.exit(1);  // Exit the application if the token is not set
}

// Initialize Telegram Bot with polling
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Database placeholders for users and roles
let users = [];
const userChoices = {};
const premiumCodes = [];
const superAdminId = "7303124996";  // Super Admin Telegram ID
const roles = { "7303124996": "admin" };

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

// Add Funds Command
bot.onText(/\/addfunds (\d+) (\d+)/, (msg, match) => {
  const chatId = msg.chat.id.toString();
  const targetId = match[1];
  const amount = parseInt(match[2]);

  if (chatId !== superAdminId) {
    bot.sendMessage(chatId, "🚫 Only Super Admin can add funds.");
    return;
  }

  let targetUser = users.find(u => u.telegramId === targetId);
  if (!targetUser) {
    // Initialize user if not present
    targetUser = {
      telegramId: targetId,
      walletBalance: 0,
      rolloverSubscriptionEnd: null,
      rolloverOddsType: null,
      purchaseHistory: []
    };
    users.push(targetUser);
  }

  targetUser.walletBalance += amount;

  bot.sendMessage(chatId, `✅ Added ₦${amount} to user ${targetId}'s wallet. New balance: ₦${targetUser.walletBalance}`);
  bot.sendMessage(targetId, `💰 Your wallet has been credited with ₦${amount}. New balance: ₦${targetUser.walletBalance}`);
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
  const text = msg.text?.trim();

  if (!text) return;

  // Initialize user if not present
  let user = users.find(u => u.telegramId === chatId);
  if (!user) {
    user = {
      telegramId: chatId,
      walletBalance: 0,
      rolloverSubscriptionEnd: null,
      rolloverOddsType: null,
      purchaseHistory: []
    };
    users.push(user);
  }

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

      const codeEntry = {
        oddsRange: upload.oddsRange,
        winRate: upload.winRate,
        price: upload.price,
        bookmaker: upload.bookmaker,
        logo: upload.logo,
        code: upload.code,
        expiryTime: upload.expiryTime
      };

      premiumCodes.push(codeEntry);

      // Record the upload in admin's purchase history
      user.purchaseHistory.push({
        type: 'Booking Code Upload',
        oddsRange: upload.oddsRange,
        price: upload.price,
        date: new Date().toISOString()
      });

      delete userChoices[chatId];
      bot.sendMessage(chatId, "🎯 Booking Code Successfully Uploaded with Expiry Time!");
    }

    return;
  }

  // Handle /history command
  if (text === '/history') {
    if (!user.purchaseHistory || user.purchaseHistory.length === 0) {
      bot.sendMessage(chatId, "📜 No purchase history found.");
      return;
    }

    let historyMessage = "📜 *Purchase History:*\n\n";

    user.purchaseHistory.forEach((record, index) => {
      const date = new Date(record.date).toLocaleDateString();
      if (record.type === 'Booking Code') {
        historyMessage += `*${index + 1}.* [Booking Code] ${record.oddsRange} | ₦${record.price} | ${date}\n`;
      } else if (record.type === 'Rollover') {
        historyMessage += `*${index + 1}.* [Rollover] ${record.oddsType} (${record.duration}) | ₦${record.price} | ${date}\n`;
      } else if (record.type === 'Booking Code Upload') {
        historyMessage += `*${index + 1}.* [Upload] ${record.oddsRange} | ₦${record.price} | ${date}\n`;
      }
    });

    bot.sendMessage(chatId, historyMessage, { parse_mode: 'Markdown' });
    return;
  }

  // Handle /wallet command
  if (text === '/wallet') {
    const balance = user.walletBalance || 0;
    let message = `💰 *Wallet Balance:* ₦${balance}\n`;

    if (user.rolloverSubscriptionEnd && new Date(user.rolloverSubscriptionEnd) > new Date()) {
      message += `\n📅 *Active Rollover Subscription:*\n`;
      message += `- Odds Type: ${user.rolloverOddsType}\n`;
      message += `- Ends On: ${new Date(user.rolloverSubscriptionEnd).toLocaleDateString()}`;
    } else {
      message += `\n📅 *No active rollover subscription.*`;
    }

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
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
