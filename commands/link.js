module.exports = (bot, api) => {
  bot.onText(/\/link (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const code = match[1].trim();

    try {
      const res = await api.post('/auth/telegram/link', {
        code,
        telegramId: chatId,
        name: msg.from.first_name,
      });

      bot.sendMessage(chatId, '✅ Your Telegram account has been successfully linked to your CashoutTips account.');
    } catch (err) {
      const message = err.response?.data?.message || '❌ Failed to link your account. Please try again.';
      bot.sendMessage(chatId, message);
      console.error("Link error:", err.message);
    }
  });
};
