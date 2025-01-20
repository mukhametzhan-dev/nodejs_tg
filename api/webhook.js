const { bot, initDB, SUDO_USERS } = require("../bot");
const express = require("express");
const serverless = require("serverless-http");

const app = express();

// Initialize the database
initDB();

// Retrieve the Vercel URL from environment variables or use a default
const URL = process.env.URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://your-vercel-domain.vercel.app');

// Set the webhook
bot.telegram.setWebhook(`${URL}/api/webhook`);

// Use Telegraf's webhook callback
app.use(bot.webhookCallback("/api/webhook"));

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Telegram bot is running.");
});

// Export the Express app and the serverless handler
module.exports = app;
module.exports.handler = serverless(app);