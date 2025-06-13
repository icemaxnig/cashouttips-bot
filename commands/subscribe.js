
const plans = {
  '1.5-3': 2000,
  '1.5-5': 3000,
  '1.5-7': 4000,
  '2.0-3': 2500,
  '2.0-5': 4000,
  '2.0-7': 5500,
  '3.0-3': 3000,
  '3.0-5': 5000,
  '3.0-7': 7000,
};

module.exports = (bot, api) => {
  bot.onText(/\/subscribe/, (msg) => {
    const chatId = msg.chat.id;

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "1.5 Odds - 3 Days (₦2000)", callback_data: "sub_1.5_3" },
            { text: "1.5 Odds - 5 Days (₦3000)", callback_data: "sub_1.5_5" },
            { text: "1.5 Odds - 7 Days (₦4000)", callback_data: "sub_1.5_7" }
          ],
          [
            { text: "2.0 Odds - 3 Days (₦2500)", callback_data: "sub_2.0_3" },
            { text: "2.0 Odds - 5 Days (₦4000)", callback_data: "sub_2.0_5" },
            { text: "2.0 Odds - 7 Days (₦5500)", callback_data: "sub_2.0_7" }
          ],
          [
            { text: "3.0 Odds - 3 Days (₦3000)", callback_data: "sub_3.0_3" },
            { text: "3.0 Odds - 5 Days (₦5000)", callback_data: "sub_3.0_5" },
            { text: "3.0 Odds - 7 Days (₦7000)", callback_data: "sub_3.0_7" }
          ]
        ]
      }
    };

    bot.sendMessage(chatId, "🛒 Select a rollover plan to subscribe:", options);
  });

  bot.on("callback_query", async (callbackQuery) => {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;

    if (!data.startsWith("sub_")) return;

    const [, type, days] = data.split("_");
    const key = `${type}-${days}`;
    const price = plans[key];

    const confirmOptions = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `✅ Confirm ₦${price} Purchase`,
              callback_data: `confirm_${type}_${days}`
            },
            {
              text: "❌ Cancel",
              callback_data: "cancel_sub"
            }
          ]
        ]
      }
    };

    bot.sendMessage(chatId, `🧾 You're about to subscribe to:

Plan: ${type} Odds
Duration: ${days} days
Price: ₦${price}

Do you want to proceed?`, confirmOptions);
  });

  bot.on("callback_query", async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data === "cancel_sub") {
      return bot.sendMessage(chatId, "❌ Subscription cancelled.");
    }

    if (!data.startsWith("confirm_")) return;

    const [, type, days] = data.split("_");
    const key = `${type}-${days}`;
    const price = plans[key];

    try {
      const res = await api.post("/rollover/subscribe", {
        telegramId: chatId,
        type,
        days: Number(days)
      });

      if (res.data && res.data.success) {
        bot.sendMessage(chatId, `✅ Subscribed to ${type} odds plan for ${days} days!
Amount: ₦${price}`);
      } else {
        bot.sendMessage(chatId, `⚠️ Subscription failed: ${res.data.message || "unknown error"}`);
      }
    } catch (err) {
      console.error("Subscription error:", err.message);
      bot.sendMessage(chatId, "❌ Could not complete subscription.");
    }
  });
};
