module.exports = (bot, api) => {
  bot.onText(/\/uploadcode/, (msg) => {
    bot.sendMessage(msg.chat.id, "🎫 Booking code uploaded successfully.");
  });
};
