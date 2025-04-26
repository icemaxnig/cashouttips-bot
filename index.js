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
const premiumCodes = [
  { oddsRange: "2–3 Odds", winRate: "85%+", price: 2000, bookmaker: "SportyBet", logo: "https://upload.wikimedia.org/wikipedia/commons/8/8f/SportyBet_logo.png", code: "SPT12345" },
  { oddsRange: "4–5 Odds", winRate: "75%", price: 1500, bookmaker: "Bet9ja", logo: "https://upload.wikimedia.org/wikipedia/en/9/9e/Bet9ja_logo.png", code: "BET98765" },
  { oddsRange: "6–10 Odds", winRate: "65%", price: 1000, bookmaker: "BetKing", logo: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Betking.png", code: "KING56789" },
  { oddsRange: "11–20 Odds", winRate: "55%", price: 800, bookmaker: "1xBet", logo: "https://upload.wikimedia.org/wikipedia/commons/4/42/1xbet-logo.png", code: "1XBET123" },
  { oddsRange: "50+ Odds", winRate: "30%", price: 200, bookmaker: "MerryBet", logo: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Merrybet.png", code: "MERRY777" }
];
const superAdminId = "7303124996";
const roles = { "7303124996": "admin" };

const token = '7255761612:AAHWmkWrtBvtxpS88toYXRAPasjXBfExzbY';
const bot = new TelegramBot(token, { polling: true });

// /promote command (Only super admin)
bot.onText(/\/promote (.+)/, (msg, match) => {
  const chatId = msg.chat.id.toString();
  const newAdminId = match[1].trim();

  if (chatId !== superAdminId) {
    bot.sendMessage(chatId, "🚫 Only Super Admin can promote users.");
    return;
  }

  roles[newAdminId] = "admin";
  bot.sendMessage(chatId, `✅ User with ID ${newAdminId} promoted to Admin.`);
});

// /demote command (Only super admin)
bot.onText(/\/demote (.+)/, (msg, match) => {
  const chatId = msg.chat.id.toString();
  const removeAdminId = match[1].trim();

  if (chatId !== superAdminId) {
    bot.sendMessage(chatId, "🚫 Only Super Admin can demote users.");
    return;
  }

  if (roles[removeAdminId]) {
    delete roles[removeAdminId];
    bot.sendMessage(chatId, `✅ User with ID ${removeAdminId} demoted successfully.`);
  } else {
    bot.sendMessage(chatId, `❌ User with ID ${removeAdminId} is not an Admin.`);
  }
});

// Other commands like /start, /today, /buycode, /uploadcode, /fundwallet, etc.
// Would continue similarly in the real full working file setup