module.exports = (bot, api) => {
  bot.onText(/\/uploadtip (.+)/, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const ADMIN_ID = process.env.ADMIN_ID;

    if (chatId !== ADMIN_ID) {
      return bot.sendMessage(chatId, "❌ You are not authorized to use this command.");
    }

    const input = match[1].trim();
    const parts = input.split(" ");
    if (parts.length < 3) {
      return bot.sendMessage(chatId, "⚠️ Usage:\n/uploadtip planType day tipContent");
    }

    const planType = parts[0];
    const day = parseInt(parts[1]);
    const tipContent = parts.slice(2).join(" ");

    try {
      const res = await api.post("/admin/uploadtip", {
        planType,
        day,
        tipContent
      });

      bot.sendMessage(chatId, `✅ Tip uploaded for *${planType}* - Day ${day}`, {
        parse_mode: "Markdown"
      });
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to upload tip.";
      bot.sendMessage(chatId, `❌ ${msg}`);
    }
  });
};
