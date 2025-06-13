module.exports = (bot, api) => {
  bot.onText(/\/deposit/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      "📨 To deposit funds, visit: https://cashouttips.com/deposit or use the Paystack button in your dashboard."
    );
  });
};
