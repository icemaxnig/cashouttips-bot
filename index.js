require('dotenv').config();
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(bodyParser.json());

// Users array: walletBalance and rolloverSubscriptionEnd
let users = [];

const token = '7255761612:AAHWmkWrtBvtxpS88toYXRAPasjXBfExzbY';
const bot = new TelegramBot(token, { polling: true });

// /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "👋 Welcome to CashoutTips 2.0!");
});

// /today command
bot.onText(/\/today/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "🔥 Today's Tips:\n\n- Manchester City to Win\n- Bayern Munich Over 2.5 Goals\n- Juventus to Score 1+ Goal\n\nGood luck! 🍀");
});

// /results command
bot.onText(/\/results/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "📊 Today's Results:\n\n- Manchester City ✅\n- Bayern Munich ✅\n- Juventus ❌\n\nKeep believing! 🔥");
});

// /getid command
bot.onText(/\/getid/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `🆔 Your Telegram ID is: ${chatId}\n\n🔔 Copy this ID to use when funding your wallet.`);
});

// /wallet command
bot.onText(/\/wallet/, (msg) => {
  const chatId = msg.chat.id.toString();
  const user = users.find(u => u.telegramId === chatId);

  if (user) {
    bot.sendMessage(chatId, `💰 Your Wallet Balance: ₦${user.walletBalance}`);
  } else {
    bot.sendMessage(chatId, `💰 Your Wallet Balance: ₦0`);
  }
});

// /fundwallet command
bot.onText(/\/fundwallet/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "💵 How much do you want to fund your wallet? (Reply with amount in Naira, e.g., 1000)");
});

// Handle fund amount reply
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  if (!isNaN(text) && Number(text) >= 100) { // minimum ₦100
    const amount = Number(text) * 100; // Paystack uses kobo

    const payload = {
      email: `${chatId}@cashouttips.com`,
      amount: amount,
      metadata: {
        telegram_id: chatId.toString()
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

// /rollover command (protected - example, we will improve it)
bot.onText(/\/rollover/, (msg) => {
  const chatId = msg.chat.id.toString();
  const user = users.find(u => u.telegramId === chatId);

  if (user && user.walletBalance > 0) {
    bot.sendMessage(chatId, "🔁 Rollover Plan (3 Days):\n\n- Arsenal Over 1.5\n- PSG to Win\n\nStay consistent! 📈");
  } else {
    bot.sendMessage(chatId, "🚫 You must fund your wallet and subscribe first! Use /fundwallet.");
  }
});

// /code command (protected - example, we will improve it)
bot.onText(/\/code/, (msg) => {
  const chatId = msg.chat.id.toString();
  const user = users.find(u => u.telegramId === chatId);

  if (user && user.walletBalance > 0) {
    bot.sendMessage(chatId, "💎 Premium Booking Codes:\n\n- SportyBet: ABCD1234\n- Bet9ja: XYZ5678\n- BetKing: PQRS9012");
  } else {
    bot.sendMessage(chatId, "🚫 You must fund your wallet first! Use /fundwallet.");
  }
});

// Paystack webhook to fund wallet
app.post('/paystack/webhook', (req, res) => {
  const event = req.body;

  if (event.event === 'charge.success') {
    const metadata = event.data.metadata;
    const telegramId = metadata.telegram_id;
    const amount = event.data.amount / 100; // Naira

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
