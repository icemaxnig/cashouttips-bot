module.exports = (bot, api) => {
  bot.onText(/\/withdraw (\d+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = chatId.toString();
    const amount = parseInt(match[1]);
    const method = match[2];

    try {
      await api.post("/withdraw/request", {
        userId,
        amount,
        method
      });

      bot.sendMessage(chatId, `✅ Withdrawal request submitted!\nAmount: ₦${amount}\nMethod: ${method}`);
    } catch (err) {
      const msgText = err.response?.data?.error || "❌ Withdrawal failed.";
      bot.sendMessage(chatId, msgText);
    }
  });

  bot.onText(/\/withdraw$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "💳 Enter amount and method (e.g., `/withdraw 2000 Opay-0812...`)", {
      parse_mode: "Markdown"
    });
  });
};
