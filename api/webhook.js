const express = require("express");
const serverless = require("serverless-http");
const { bot, initDB, SUDO_USERS } = require("../bot"); // Ensure correct import

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Initialize the database
initDB();

// Retrieve the Vercel URL from environment variables or use a default
const URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://your-vercel-domain.vercel.app';

// Set the webhook
bot.telegram.setWebhook(`${URL}/api/webhook`)
  .then(() => console.log(`Webhook set to ${URL}/api/webhook`))
  .catch(err => console.error('Error setting webhook:', err));

// Logging incoming requests (optional but recommended)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Received request: ${req.method} ${req.url}`);
  next();
});

// Use Telegraf's webhook callback
app.use(bot.webhookCallback("/api/webhook"));

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Telegram bot is running.");
});

// Export the Express app and the serverless handler
module.exports = app;
module.exports.handler = serverless(app);
