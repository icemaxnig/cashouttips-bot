module.exports = (bot, api) => {
  bot.onText(/\/wallet/, async (msg) => {
    const userId = msg.chat.id.toString();

    try {
      const res = await api.get(`/wallet/${userId}`);
      const { main, bonus } = res.data;

      bot.sendMessage(msg.chat.id, `💰 *Your Wallet*\nMain: ₦${main}\nBonus: ₦${bonus}`, {
        parse_mode: "Markdown",
      });
    } catch (err) {
      if (err.response && err.response.status === 404) {
        bot.sendMessage(msg.chat.id, "💼 No wallet found. You have ₦0 in both Main and Bonus wallets.");
      } else {
        bot.sendMessage(msg.chat.id, "❌ Error checking your wallet.");
        console.error(err.message);
      }
    }
  });
};
