
const axios = require("axios");

module.exports = (bot, api) => {
  bot.onText(/\/codes/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const res = await api.get("/booking/available");
      const codes = res.data;

      if (!codes || codes.length === 0) {
        return bot.sendMessage(chatId, "❌ No booking codes are currently available.");
      }

      for (const code of codes.slice(0, 5)) { // limit to top 5 codes for simplicity
        const caption = `
🎯 <b>Booking Code</b>

<b>Match:</b> ${code.teams}
<b>Odds:</b> ${code.odds}
<b>Bookmaker:</b> ${code.bookmaker}
<b>Price:</b> ₦${code.price}
<b>Confidence:</b> ${code.successRate}%

Click below to buy 👇
        `.trim();

        bot.sendMessage(chatId, caption, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: `Buy for ₦${code.price}`,
                  callback_data: `buycode_${code._id}`
                }
              ]
            ]
          }
        });
      }
    } catch (err) {
      console.error("Error fetching booking codes:", err.message);
      bot.sendMessage(chatId, "❌ Failed to load booking codes.");
    }
  });

  // Handle buy button click
  bot.on("callback_query", async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const data = callbackQuery.data;

    if (!data.startsWith("buycode_")) return;

    const bookingId = data.split("_")[1];

    try {
      const res = await api.post("/booking/purchase", {
        telegramId: chatId,
        bookingId,
      });

      if (res.data && res.data.success) {
        bot.sendMessage(chatId, "✅ Booking code purchased successfully!");
      } else {
        bot.sendMessage(chatId, "⚠️ Purchase failed: " + (res.data.message || "unknown error"));
      }
    } catch (err) {
      console.error("Purchase error:", err.message);
      bot.sendMessage(chatId, "❌ Could not complete purchase.");
    }
  });
};
