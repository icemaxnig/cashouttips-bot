module.exports = (bot, api) => {
  bot.onText(/\/referral/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = chatId.toString();
    const link = `https://cashouttips.com/r/${userId}`;

    try {
      const res = await api.get(`/referral/stats/${userId}`);
      const { count, totalEarned } = res.data;

      const message =
        `🔗 *Your Referral Link:*\n${link}\n\n` +
        `👥 Referrals: ${count}\n` +
        `💰 Earned: ₦${totalEarned}`;

      bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (err) {
      bot.sendMessage(chatId, "❌ Failed to load referral stats.");
    }
  });
};
