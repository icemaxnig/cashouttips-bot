
const express = require("express");
const router = express.Router();
const BookingPurchase = require("../models/BookingPurchase");
const User = require("../models/User");

router.get("/my-codes", async (req, res) => {
  const { telegramId } = req.query;
  if (!telegramId) return res.status(400).json({ message: "telegramId is required" });

  const user = await User.findOne({ telegramId });
  if (!user) return res.status(404).json({ message: "User not found" });

  const purchases = await BookingPurchase.find({ userId: user._id }).sort({ createdAt: -1 });
  res.json(purchases);
});

module.exports = router;
