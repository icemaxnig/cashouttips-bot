const formatDate = (iso) => {
  const date = new Date(iso);
  return date.toLocaleDateString("en-GB");
};

module.exports = (bot, api) => {
  bot.onText(/\/mycodes/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = chatId.toString();

    try {
      const res = await api.get("/booking/available"); // fetch all active
      const userCodes = res.data.filter(code =>
        code.usedBy.includes(userId)
      );

      if (!userCodes.length) {
        return bot.sendMessage(chatId, "🎟 You haven’t purchased any codes yet.");
      }

      userCodes.forEach(code => {
        const result = code.result ? (code.result === "WON" ? "✅ WON" : "❌ LOST") : "⏳ Pending";
        const message =
          `🎟 *${code.code}*\n` +
          `Odds: ${code.odds}\n` +
          `Expires: ${formatDate(code.expiry)}\n` +
          `Result: ${result}`;

        bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      });
    } catch (err) {
      bot.sendMessage(chatId, "❌ Failed to load your codes.");
    }
  });
};
