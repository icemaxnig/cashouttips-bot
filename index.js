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
const userChoices = {}; // store temporary choices for rollover or buycode

// Premium codes flexible list
const premiumCodes = [
  {
    oddsRange: "2–3 Odds",
    winRate: "85%+",
    price: 2000,
    bookmaker: "SportyBet",
    logo: "https://upload.wikimedia.org/wikipedia/commons/8/8f/SportyBet_logo.png",
    code: "SPT12345"
  },
  {
    oddsRange: "4–5 Odds",
    winRate: "75%",
    price: 1500,
    bookmaker: "Bet9ja",
    logo: "https://upload.wikimedia.org/wikipedia/en/9/9e/Bet9ja_logo.png",
    code: "BET98765"
  },
  {
    oddsRange: "6–10 Odds",
    winRate: "65%",
    price: 1000,
    bookmaker: "BetKing",
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Betking.png",
    code: "KING56789"
  },
  {
    oddsRange: "11–20 Odds",
    winRate: "55%",
    price: 800,
    bookmaker: "1xBet",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/42/1xbet-logo.png",
    code: "1XBET123"
  },
  {
    oddsRange: "50+ Odds",
    winRate: "30%",
    price: 200,
    bookmaker: "MerryBet",
    logo: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Merrybet.png",
    code: "MERRY777"
  }
];

// Your Bot Token
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
  bot.sendMessage(chatId, `🆔 Your Telegram ID is: ${chatId}\n\n🔔 Copy this ID when funding wallet.`);
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
  bot.sendMessage(chatId, "💵 How much do you want to fund your wallet? (Reply with amount, e.g., 1000)");
});

// /buyrollover
bot.onText(/\/buyrollover/, (msg) => {
  const chatId = msg.chat.id.toString();
  bot.sendMessage(chatId, `🛒 Choose Rollover Odds Category:

1️⃣ 1.5 Odds
2️⃣ 2.0 Odds
3️⃣ 3.0 Odds

👉 Reply with 1, 2, or 3 to select.`);
  userChoices[chatId] = { stage: 'odds' };
});

// /buycode
bot.onText(/\/buycode/, (msg) => {
  const chatId = msg.chat.id.toString();
  
  let message = `🎯 *Available Premium Booking Codes:*\n\n`;
  premiumCodes.forEach((item, index) => {
    message += `🔹 ${index + 1}. ${item.oddsRange} (${item.winRate}) - ₦${item.price} - ${item.bookmaker}\n`;
  });
  message += "\n👉 Reply with the number (1, 2, 3...) to buy.";

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  
  userChoices[chatId] = { stage: 'buycode' };
});

// /rollover
bot.onText(/\/rollover/, (msg) => {
  const chatId = msg.chat.id.toString();
  const user = users.find(u => u.telegramId === chatId);
  if (user && user.rolloverSubscriptionEnd) {
    const today = new Date().toISOString().split('T')[0];
    if (today <= user.rolloverSubscriptionEnd) {
      bot.sendMessage(chatId, `🔁 Your Rollover Plan (${user.rolloverOddsType}):\n\n- Arsenal Over 1.5\n- PSG to Win`);
    } else {
      bot.sendMessage(chatId, "🚫 Your Rollover subscription has expired. Please /buyrollover.");
    }
  } else {
    bot.sendMessage(chatId, "🚫 You have not subscribed yet. Please /buyrollover.");
  }
});

// /code
bot.onText(/\/code/, (msg) => {
  const chatId = msg.chat.id.toString();
  const user = users.find(u => u.telegramId === chatId);
  if (user && user.walletBalance > 0) {
    bot.sendMessage(chatId, "💎 Premium Booking Codes:\n\n- SportyBet: ABCD1234\n- Bet9ja: XYZ5678\n- BetKing: PQRS9012");
  } else {
    bot.sendMessage(chatId, "🚫 You must fund your wallet first! Use /fundwallet.");
  }
});

// Handle all messages (for fundwallet, rollover, buycode)
bot.on('message', async (msg) => {
  const chatId = msg.chat.id.toString();
  const text = msg.text.trim();
  const user = users.find(u => u.telegramId === chatId);

  if (userChoices[chatId]) {
    const choice = userChoices[chatId];

    if (choice.stage === 'odds') {
      if (["1", "2", "3"].includes(text)) {
        choice.odds = text;
        choice.stage = 'duration';
        bot.sendMessage(chatId, `📅 Choose Plan Duration:

1️⃣ 3 Days
2️⃣ 5 Days
3️⃣ 7 Days

👉 Reply with 1, 2, or 3.`);
      } else {
        bot.sendMessage(chatId, "❌ Please reply 1, 2, or 3 to select odds.");
      }
    }
    else if (choice.stage === 'duration') {
      if (["1", "2", "3"].includes(text)) {
        handleRolloverFinal(chatId, choice.odds, text);
        delete userChoices[chatId];
      } else {
        bot.sendMessage(chatId, "❌ Please reply 1, 2, or 3 to select duration.");
      }
    }
    else if (choice.stage === 'buycode') {
      const number = parseInt(text);
      if (!isNaN(number) && number >= 1 && number <= premiumCodes.length) {
        handleBuyCode(chatId, number - 1);
        delete userChoices[chatId];
      } else {
        bot.sendMessage(chatId, "❌ Please reply a valid number from the list.");
      }
    }

    return;
  }

  // If user not in any flow: handle funding
  if (!isNaN(text) && Number(text) >= 100) {
    if (!user) {
      bot.sendMessage(chatId, "🚫 You need to start properly. Type /start and /fundwallet.");
      return;
    }

    const amount = Number(text) * 100;

    const payload = {
      email: `${chatId}@cashouttips.com`,
      amount: amount,
      metadata: { telegram_id: chatId }
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
      console.error('Payment link error:', error.response.data);
      bot.sendMessage(chatId, "❌ Failed to create payment link. Please try again.");
    }
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

    console.log(`✅ Wallet updated: ${telegramId} credited ₦${amount}`);
  }

  res.sendStatus(200);
});

// Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Cron Jobs
cron.schedule('0 8 * * *', () => {
  const message = "🔥 Morning Tips:\n\n- Manchester City to Win\n- Bayern Over 2.5\n- Juventus to Score";
  bot.sendMessage(7303124996, message);
});
cron.schedule('30 23 * * *', () => {
  const message = "📊 Today's Results:\n\n- Man City ✅\n- Bayern ✅\n- Juventus ❌";
  bot.sendMessage(7303124996, message);
});

// Functions
function handleRolloverFinal(chatId, oddsChoice, durationChoice) {
  const user = users.find(u => u.telegramId === chatId);

  if (!user) {
    bot.sendMessage(chatId, "🚫 Fund your wallet first. Use /fundwallet.");
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

    bot.sendMessage(chatId, `✅ Subscribed to ${odds} for ${days} days! Expires: ${user.rolloverSubscriptionEnd}`);
  } else {
    bot.sendMessage(chatId, "🚫 Insufficient balance. Please /fundwallet.");
  }
}

function handleBuyCode(chatId, codeIndex) {
  const user = users.find(u => u.telegramId === chatId);

  if (!user) {
    bot.sendMessage(chatId, "🚫 Fund your wallet first. Use /fundwallet.");
    return;
  }

  const selectedCode = premiumCodes[codeIndex];

  if (user.walletBalance >= selectedCode.price) {
    user.walletBalance -= selectedCode.price;
    bot.sendPhoto(chatId, selectedCode.logo, {
      caption: `✅ Payment Successful!\n\n💎 ${selectedCode.oddsRange} - ${selectedCode.winRate}\n🏦 Bookmaker: ${selectedCode.bookmaker}\n🔖 Booking Code: *${selectedCode.code}*\n\n🎯 Good luck boss!`,
      parse_mode: "Markdown"
    });
  } else {
    bot.sendMessage(chatId, "🚫 Insufficient Wallet Balance. Please /fundwallet.");
  }
}
