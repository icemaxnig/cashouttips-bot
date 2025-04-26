require('dotenv').config();
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(bodyParser.json());

// Users array
let users = [];
const userChoices = {}; // Temporary storage for buyrollover selection

const token = '7255761612:AAHWmkWrtBvtxpS88toYXRAPasjXBfExzbY';
const bot = new TelegramBot(token, { polling: true });

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "👋 Welcome to CashoutTips 2.0!");
});

// /today
bot.onText(/\/today/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "🔥 Today's Tips:\n\n- Manchester City to Win\n- Bayern Munich Over 2.5 Goals\n- Juventus to Score 1+ Goal\n\nGood luck! 🍀");
});

// /results
bot.onText(/\/results/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "📊 Today's Results:\n\n- Manchester City ✅\n- Bayern Munich ✅\n- Juventus ❌\n\nKeep believing! 🔥");
});

// /getid
bot.onText(/\/getid/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `🆔 Your Telegram ID is: ${chatId}\n\n🔔 Copy this ID to use when funding your wallet.`);
});

// /wallet
bot.onText(/\/wallet/, (msg) => {
  const chatId = msg.chat.id.toString();
  const user = users.find(u => u.telegramId === chatId);

  if (user) {
    bot.sendMessage(chatId, `💰 Your Wallet Balance: ₦${user.walletBalance}`);
  } else {
    bot.sendMessage(chatId, `💰 Your Wallet Balance: ₦0`);
  }
});

// /fundwallet
bot.onText(/\/fundwallet/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "💵 How much do you want to fund your wallet? (Reply with amount in Naira, e.g., 1000)");
});

// Handle fund amount reply
bot.on('message', async (msg) => {
  const chatId = msg.chat.id.toString();
  const text = msg.text.trim();

  if (!isNaN(text) && Number(text) >= 100) { // User entering amount
    const amount = Number(text) * 100;

    const payload = {
      email: `${chatId}@cashouttips.com`,
      amount: amount,
      metadata: {
        telegram_id: chatId
      }
    };

    try {
      const response = await axios.post('https://api.paystack.co/transaction/initialize', payload, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const paymentLink = response.data.data.authorization_url;
      bot.sendMessage(chatId, `🔗 Click here to fund your wallet:\n${paymentLink}`);
    } catch (error) {
      console.error('Error creating Paystack link:', error.response.data);
      bot.sendMessage(chatId, "❌ Failed to create payment link. Please try again.");
    }
  }
});

// /buyrollover - Step 1: Choose Odds
bot.onText(/\/buyrollover/, (msg) => {
  const chatId = msg.chat.id;
  
  const message = `🛒 Choose Rollover Odds Category:

1️⃣ 1.5 Odds
2️⃣ 2 Odds
3️⃣ 3 Odds

👉 Reply with 1, 2, or 3 to select.`;
  
  bot.sendMessage(chatId, message);
});

// Handle Odds & Plan Selection
bot.on('message', (msg) => {
  const chatId = msg.chat.id.toString();
  const text = msg.text.trim();

  if (["1", "2", "3"].includes(text) && !userChoices[chatId]) {
    userChoices[chatId] = text; // Odds selected
    bot.sendMessage(chatId, `📅 Choose Plan Duration:

1️⃣ 3 Days
2️⃣ 5 Days
3️⃣ 7 Days

👉 Reply with 1, 2, or 3 to select duration.`);
  } else if (["1", "2", "3"].includes(text) && userChoices[chatId]) {
    handleRolloverFinal(chatId, userChoices[chatId], text);
    delete userChoices[chatId];
  }
});

// Final Rollover Purchase
function handleRolloverFinal(chatId, oddsChoice, durationChoice) {
  const user = users.find(u => u.telegramId === chatId);

  if (!user) {
    bot.sendMessage(chatId, "🚫 You need to fund your wallet first. Use /fundwallet.");
    return;
  }

  let price = 0;
  let days = 0;
  let odds = "";

  if (oddsChoice === "1") odds = "1.5 Odds";
  else if (oddsChoice === "2") odds = "2.0 Odds";
  else if (oddsChoice === "3") odds = "3.0 Odds";

  if (oddsChoice === "1") {
    if (durationChoice === "1") { price = 2500; days = 3; }
    else if (durationChoice === "2") { price = 4000; days = 5; }
    else if (durationChoice === "3") { price = 5000; days = 7; }
  } else if (oddsChoice === "2") {
    if (durationChoice === "1") { price = 3000; days = 3; }
    else if (durationChoice === "2") { price = 5000; days = 5; }
    else if (durationChoice === "3") { price = 6500; days = 7; }
  } else if (oddsChoice === "3") {
    if (durationChoice === "1") { price = 4000; days = 3; }
    else if (durationChoice === "2") { price = 6500; days = 5; }
    else if (durationChoice === "3") { price = 8000; days = 7; }
  }

  if (user.walletBalance >= price) {
    user.walletBalance -= price;
    const now = new Date();
    now.setDate(now.getDate() + days);
    user.rolloverSubscriptionEnd = now.toISOString().split('T')[0];
    user.rolloverOddsType = odds;

    bot.sendMessage(chatId, `✅ Successfully subscribed to ${odds} (${days} Days Plan)!\n\n🔒 Your access expires on ${user.rolloverSubscriptionEnd}.`);
  } else {
    bot.sendMessage(chatId, "🚫 Insufficient Wallet Balance. Please /fundwallet first.");
  }
}

// /rollover command (protected)
bot.onText(/\/rollover/, (msg) => {
  const chatId = msg.chat.id.toString();
  const user = users.find(u => u.telegramId === chatId);

  if (user && user.rolloverSubscriptionEnd) {
    const today = new Date().toISOString().split('T')[0];
    if (today <= user.rolloverSubscriptionEnd) {
      bot.sendMessage(chatId, `🔁 Your Rollover Plan (${user.rolloverOddsType}):\n\n- Arsenal Over 1.5\n- PSG to Win\n\nStay consistent! 📈`);
    } else {
      bot.sendMessage(chatId, "🚫 Your Rollover subscription has expired. Please /buyrollover to renew.");
    }
  } else {
    bot.sendMessage(chatId, "🚫 You have not subscribed yet. Please /buyrollover to get access.");
  }
});

// /code command
bot.onText(/\/code/, (msg) => {
  const chatId = msg.chat.id.toString();
  const user = users.find(u => u.telegramId === chatId);

  if (user && user.walletBalance > 0) {
    bot.sendMessage(chatId, "💎 Premium Booking Codes:\n\n- SportyBet: ABCD1234\n- Bet9ja: XYZ5678\n- BetKing: PQRS9012");
  } else {
    bot.sendMessage(chatId, "🚫 You must fund your wallet first! Use /fundwallet.");
  }
});

// Paystack webhook
app.post('/paystack/webhook', (req, res) => {
  const event = req.body;

  if (event.event === 'charge.success') {
    const metadata = event.data.metadata;
    const telegramId = metadata.telegram_id;
    const amount = event.data.amount / 100;

    console.log(`💵 Payment received: ₦${amount} from ${telegramId}`);

    let user = users.find(u => u.telegramId === telegramId);
    if (user) {
      user.walletBalance += amount;
    } else {
      users.push({
        telegramId: telegramId,
        walletBalance: amount,
        rolloverSubscriptionEnd: null
      });
    }

    console.log(`✅ Wallet updated: ${telegramId} now has ₦${amount}`);
  }

  res.sendStatus(200);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Auto-send daily tips
cron.schedule('0 8 * * *', () => {
  const message = "🔥 Morning Tips:\n\n- Manchester City to Win\n- Bayern Over 2.5\n- Juventus to Score";
  bot.sendMessage(7303124996, message);
});

// Auto-send daily results
cron.schedule('30 23 * * *', () => {
  const message = "📊 Today's Results:\n\n- Man City ✅\n- Bayern ✅\n- Juventus ❌";
  bot.sendMessage(7303124996, message);
});
