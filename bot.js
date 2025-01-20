require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const mysql = require("mysql2/promise");

// Database Configuration
const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4",
};

// Initialize Telegraf Bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Initialize the database and create the botusers table
async function initDB() {
  const conn = await mysql.createConnection(DB_CONFIG);
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS botusers (
      user_id BIGINT PRIMARY KEY,
      username VARCHAR(255),
      refcount INT DEFAULT 0,
      balance INT DEFAULT 0,
      name VARCHAR(255),
      invitedby BIGINT
    )
  `);
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      referrer_id BIGINT,
      referred_id BIGINT,
      subscribed BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (referrer_id) REFERENCES botusers(user_id),
      FOREIGN KEY (referred_id) REFERENCES botusers(user_id)
    )
  `);
  await conn.end();
}

// Define SUDO_USERS (replace with actual Telegram user IDs)
const SUDO_USERS = [7943250659]; // Add other admin user IDs as needed

// Start Command Handler
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || null;
  const name = ctx.from.first_name || "User";
  const text = ctx.message.text;
  const referrerId = text.includes(" ") ? parseInt(text.split(" ")[1], 10) : null;

  const conn = await mysql.createConnection(DB_CONFIG);

  try {
    // Check if user already exists
    const [existingUser] = await conn.execute(
      "SELECT user_id FROM botusers WHERE user_id = ?",
      [userId]
    );

    if (existingUser.length === 0) {
      // Add new user to the database
      await conn.execute(
        "INSERT INTO botusers (user_id, username, name, invitedby) VALUES (?, ?, ?, ?)",
        [userId, username, name, referrerId]
      );

      if (referrerId) {
        // Increment refcount for the referrer
        await conn.execute(
          "UPDATE botusers SET refcount = refcount + 1 WHERE user_id = ?",
          [referrerId]
        );
        await conn.execute("UPDATE botusers SET balance = balance + 38 WHERE user_id = ?", [referrerId]);
      }
    }

    // Send welcome message with inline keyboard
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url("1️⃣ КАНАЛ", "https://t.me/+wtei_zPm4803N2Iy")],
      [Markup.button.url("2️⃣ КАНАЛ", "https://t.me/+f_i1-UN7HdplNGEy")],
      [Markup.button.callback("Тексеру", "check_subscription")],
    ]);
    await ctx.reply(
      `Сәлем, ${name}! Сіз демеушілерге жазылмағансыз. Жазылуыңызды өтінемін.`,
      keyboard
    );
  } catch (error) {
    console.error("Error in /start handler:", error);
    await ctx.reply("Қате пайда болды. Қайтадан көріңіз.");
  } finally {
    await conn.end();
  }
});

// Check Subscription Handler
bot.action("check_subscription", async (ctx) => {
  const userId = ctx.from.id;

  try {
    const ch1 = await ctx.telegram.getChatMember(-1002494327985, userId);
    const ch2 = await ctx.telegram.getChatMember(-1002184512508, userId);

    const isSubscribed =
      ["member", "administrator", "creator"].includes(ch1.status) &&
      ["member", "administrator", "creator"].includes(ch2.status);

    if (isSubscribed) {
      const conn = await mysql.createConnection(DB_CONFIG);
      try {
        await conn.execute(
          "UPDATE botusers SET balance = balance + 10 WHERE user_id = ?",
          [userId]
        );
      } catch (error) {
        console.error("Error updating balance:", error);
      } finally {
        await conn.end();
      }

      const mainMenu = Markup.keyboard([
        ["Жеке Кабинет 🙋‍♂️", "Ақша Табу 💵"],
        ["Ақпарат "],
      ]).resize();
      await ctx.reply("<b>Басты мәзір ⤵️</b>", {
        parse_mode: "HTML",
        ...mainMenu,
      });
    } else {
      await ctx.reply("Өтінемін, барлық демеушілерге жазылыңыз.");
    }
  } catch (error) {
    console.error("Error in check_subscription:", error);
    await ctx.reply("Қате пайда болды. Қайтадан көріңіз.");
  }
});

// Personal Cabinet Handler
bot.hears("Жеке Кабинет 🙋‍♂️", async (ctx) => {
  const userId = ctx.from.id;
  const conn = await mysql.createConnection(DB_CONFIG);

  try {
    const [userInfo] = await conn.execute(
      "SELECT balance, refcount FROM botusers WHERE user_id = ?",
      [userId]
    );
    const balance = userInfo[0]?.balance || 0;
    const refcount = userInfo[0]?.refcount || 0;

    await ctx.reply(
      `Жеке кабинет 🔰\n\n==============================\nБарлық рефералдар саны 📈: ${refcount}\nТабысыңыз: ${balance} тг`
    );
  } catch (error) {
    console.error("Error in Жеке Кабинет handler:", error);
    await ctx.reply("Қате пайда болды. Қайтадан көріңіз.");
  } finally {
    await conn.end();
  }
});

// Earn Money Handler
bot.hears("Ақша Табу 💵", async (ctx) => {
  const referralLink = `https://t.me/adal_tenge_bot?start=${ctx.from.id}`;
  await ctx.reply(
    `Ақша табу үшін сілтемеңізді бөлісіңіз 👉\nСізге +38 тг шақырған адамыңыз демеушілерге тіркелгенде берілетін болады💚: ${referralLink}`
  );
});

// Info Handlers
bot.hears("Ақпарат 📚 ", async (ctx) => {
  await ctx.reply(
    `Бұл бот каналдарға жазылу арқылы , және өз достарыңызбен бөлісу арқылы ақша табуға көмектесетін Қазақстандық бот! \n\n Әрбір тіркелген адам үшін +38 тг берілетін болады😍 `
  );
});
bot.hears("Ақпарат", async (ctx) => {
  await ctx.reply(
    `Бұл бот каналдарға жазылу арқылы , және өз достарыңызбен бөлісу арқылы ақша табуға көмектесетін Қазақстандық бот! \n\n Әрбір тіркелген адам үшін +38 тг берілетін болады😍 `
  );
});

// Export the bot and initialization functions
module.exports = { bot, initDB, SUDO_USERS };