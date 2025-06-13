module.exports = (bot, api) => {
  bot.onText(/\/(today|freetips)/, (msg) => {
    bot.sendMessage(msg.chat.id, "🎯 Free Tip: Bayern Munich to win today!");
  });
};
