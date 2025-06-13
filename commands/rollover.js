
const axios = require("axios");

module.exports = (bot, api) => {
  bot.onText(/\/rollover/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const res = await api.get("/rollover/flex-active", {
        params: { telegramId: chatId }
      });

      const rollover = res.data;

      if (!rollover || !rollover.games || rollover.games.length === 0) {
        return bot.sendMessage(chatId, "❌ No active rollover plan found.");
      }

      const planType = rollover.planType || "Rollover";
      const currentDay = rollover.currentDay || 1;
      const totalDays = rollover.totalDays || 3;
      const totalOdds = rollover.totalOdds || "N/A";
      const bookingCode = rollover.bookingCode || "N/A";

      let message = `♻️ <b>${planType} – Day ${currentDay} of ${totalDays}</b>\n\n`;

      rollover.games.forEach(game => {
        message += `🏟️ <b>${game.league}</b>\n⚽ ${game.teams} – ${game.time}\n\n`;
      });

      message += `🎯 <b>Total Odds:</b> ${totalOdds}\n`;
      message += `🔗 <b>Booking Code:</b> ${bookingCode}`;

      bot.sendMessage(chatId, message.trim(), { parse_mode: "HTML" });

    } catch (err) {
      console.error("Error fetching rollover:", err.message);
      bot.sendMessage(chatId, "❌ Could not load your rollover tip.");
    }
  });
};
