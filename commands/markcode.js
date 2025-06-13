module.exports = (bot, api) => {
  bot.onText(/\/markcode/, (msg) => {
    bot.sendMessage(msg.chat.id, "📊 Booking code marked as successful.");
  });
};
