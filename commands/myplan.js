module.exports = (bot, api) => {
  bot.onText(/\/myplan/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = chatId.toString();

    try {
      const res = await api.get(`/rollover/myplan/${userId}`);
      const { planType, currentDay, duration, startDate } = res.data;
      const [odds, days] = planType.split('-');

      const start = new Date(startDate).toLocaleDateString("en-GB");

      bot.sendMessage(chatId,
        `📦 *Your Rollover Plan*\n` +
        `Type: ${odds} Odds – ${duration} Days\n` +
        `Day: ${currentDay} of ${duration}\n` +
        `Start: ${start}`, {
          parse_mode: "Markdown"
        }
      );
    } catch (err) {
      bot.sendMessage(chatId, "❌ You don’t have an active rollover plan.");
    }
  });
};
