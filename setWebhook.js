const axios = require("axios");

const BOT_TOKEN = "7605417375:AAGaYsWuhQnrDK3rAFSxRl7bRhsSfBe-LcU";
const WEBHOOK_URL = "https://fb07-102-89-33-11.ngrok-free.app"; // Replace with your actual ngrok URL

async function setWebhook() {
  try {
    const res = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      url: WEBHOOK_URL,
    });

    console.log("✅ Webhook Set:", res.data);
  } catch (error) {
    console.error("❌ Error setting webhook:", error.response?.data || error.message);
  }
}

setWebhook();
