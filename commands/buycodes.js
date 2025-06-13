const formatDate = (iso) => {
  const date = new Date(iso);
  return date.toLocaleDateString("en-GB");
};

module.exports = (bot, api) => {
  bot.onText(/\/buycodes/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const res = await api.get("/booking/available");
      const codes = res.data;

      if (!codes.length) {
        return bot.sendMessage(chatId, "😕 No booking codes available right now.");
      }

      const userId = chatId.toString();

codes
  .filter(item => !item.usedBy.includes(userId)) // Hide already purchased
  .forEach((item, index) => {
        const remaining = item.slots - item.usedBy.length;
        const text = `🎫 *Code #${index + 1}*\n` +
                     `Odds: ${item.odds}\n` +
                     `Price: ₦1000\n` +
                     `Slots Left: ${remaining}\n` +
                     `Expires: ${formatDate(item.expiry)}`;

        bot.sendMessage(chatId, text, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔓 Buy", callback_data: `buycode_${item.code}` }]
            ]
          }
        });
      });
    } catch (err) {
      bot.sendMessage(chatId, "❌ Failed to load booking codes.");
    }
  });

  // Handle Buy button
  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = chatId.toString();
    const data = query.data;

    if (!data.startsWith("buycode_")) return;
    const code = data.replace("buycode_", "");

    try {
      const res = await api.post("/booking/buy", { userId, code });
      const { code: booked, odds } = res.data;

      bot.sendMessage(chatId, `✅ *Purchased Code:*\n${booked}\nOdds: ${odds}`, {
        parse_mode: "Markdown"
      });
    } catch (err) {
      const msg = err.response?.data?.error || "❌ Failed to purchase.";
      bot.sendMessage(chatId, `❌ ${msg}`);
    }
  });
};
