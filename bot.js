require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const mysql = require("mysql2/promise");

// Initialize the bot with the BOT_TOKEN
const BOT_TOKEN = process.env.BOT_TOKEN;

// Database configuration
const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4",
};

// Create a new Telegraf bot instance
const bot = new Telegraf(BOT_TOKEN);

// Map to track users in the process of setting their Kaspi details
const kaspiFlow = new Map();

// Initialize the database and create the botusers table if it doesn't exist
async function initDB() {
  const conn = await mysql.createConnection(DB_CONFIG);
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS botusers (
      user_id BIGINT PRIMARY KEY,
      username VARCHAR(255),
      refcount INT DEFAULT 0,
      balance INT DEFAULT 0,
      name VARCHAR(255),
      invitedby BIGINT,
      kaspi VARCHAR(255) DEFAULT NULL
    )
  `);
  await conn.end();
}

// Start command handler
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
        // Increment refcount and balance for the referrer
        await conn.execute(
          "UPDATE botusers SET refcount = refcount + 1, balance = balance + 38 WHERE user_id = ?",
          [referrerId]
        );
      }
    }

    // Send welcome message with inline keyboard including "Реквизит" button
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url("1️⃣ КАНАЛ", "https://t.me/+wtei_zPm4803N2Iy")],
      [Markup.button.url("2️⃣ КАНАЛ", "https://t.me/+f_i1-UN7HdplNGEy")],
      [Markup.button.callback("Тексеру", "check_subscription")],
 // New Реквизит button
    ]);

    await ctx.reply(
      `Сәлем, ${name}! Сіз демеушілерге жазылмағансыз. Жазылуыңызды өтінемін.\n

Демеушілерге тіркелгеннен кейін табыс табуды бастайсыз!\n
Адал бол, шынайы табысқа қол жеткіз!\n
Ақша табудың ең сенімді жолы – адалдықта!\n`,
      keyboard
    );
  } catch (error) {
    console.error("Error in /start handler:", error);
    await ctx.reply("Қате пайда болды. Қайтадан көріңіз.");
  } finally {
    await conn.end();
  }
});

// Check subscription callback handler
bot.action("check_subscription", async (ctx) => {
  const userId = ctx.from.id;

  try {
    const ch1 = await ctx.telegram.getChatMember(-1002494327985, userId);
    const ch2 = await ctx.telegram.getChatMember(-1002184512508, userId);

    const isSubscribed =
      ["member", "administrator", "creator"].includes(ch1.status) &&
      ["member", "administrator", "creator"].includes(ch2.status);

    if (isSubscribed) {


      const mainMenu = Markup.keyboard([
        ["Жеке Кабинет 🙋‍♂️", "Ақша Табу 💵"],
        ["Ереже 📚"],
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

// Personal cabinet handler
bot.hears("Жеке Кабинет 🙋‍♂️", async (ctx) => {
  const userId = ctx.from.id;
  const conn = await mysql.createConnection(DB_CONFIG);

  try {
    const [userInfo] = await conn.execute(
      "SELECT balance, refcount, kaspi FROM botusers WHERE user_id = ?",
      [userId]
    );
    const balance = userInfo[0]?.balance || 0;
    const refcount = userInfo[0]?.refcount || 0;
    const kaspi = userInfo[0]?.kaspi || null;

    let kaspiInfo = kaspi
      ? `Kaspi: ${kaspi}`
      : "Kaspi: ❌ (Енді қосу үшін 'Реквизит 💳' батырмасын басыңыз)";
      const keyboard = Markup.inlineKeyboard([

        [Markup.button.callback("Реквизит 💳", "update_kaspi")],
   // New Реквизит button
      ]);

    await ctx.reply(
      `Жеке кабинет 🔰\n\n==============================\nБарлық рефералдар саны 📈: ${refcount}\nТабысыңыз: ${balance} тг\n${kaspiInfo}`
    ,keyboard);
  } catch (error) {
    console.error("Error in Жеке Кабинет handler:", error);
    await ctx.reply("Қате пайда болды. Қайтадан көріңіз.");
  } finally {
    await conn.end();
  }
});

// Earn money handler
bot.hears("Ақша Табу 💵", async (ctx) => {
  const referralLink = `t.me/adal_tenge_bot?start=${ctx.from.id}`;
  const name = ctx.from.first_name || "User";
  await ctx.reply(
    `🇰🇿 Құрметті, ${name} мен сізге реферал шақыру арқылы табыс табу жолын ұсынғым келеді 💰\n
( 👤 Әр адам үшін - 38 теңге )\n
💎 Адам қалай шақырамыз?\n
┗❗️Сізге берілген сілтемені достарыңызға тарату арқылы реферал жинайсыз, Сілтемені профильіңізге  қондыру арқылы жылдам табыс табасыз 💸\n

🔗 Сіздің Сілтeме:\n
${referralLink}`
  );
});

// Information handler
bot.hears(/Ереже\s?📚?/, async (ctx) => {
  await ctx.reply(
    "Табысыңыз 300 Tenge-ден асқанда, ақшаныңызды Kaspi арқылы шығара аласыз!\nЖұмысты бастап, табысыңызды арттырып, өз қолыңызбен ақша алуға мүмкіндік жасаңыз!\nЖеке сілтеме арқылы адам жинап, көп ақша таба аласыз!\nБіздің бот өте сенімді.\nЕшкімге ешқандай ақша салмайсыз, сізден ешкім ақша сұрамайды!\nАлаяқтардан сақ болыңыз!\nӘрбір шақырылған адамнан сізге 38 Tenge түседі! "
  );
});

// Handler for the "Реквизит" inline button
bot.action("update_kaspi", async (ctx) => {
  const userId = ctx.from.id;

  // Check if the user already has a Kaspi number
  const conn = await mysql.createConnection(DB_CONFIG);
  try {
    const [rows] = await conn.execute(
      "SELECT kaspi FROM botusers WHERE user_id = ?",
      [userId]
    );
    const kaspi = rows[0]?.kaspi;

    if (kaspi) {
      await ctx.reply(`Сіздің Kaspi реквизитіңіз: ${kaspi}`);
    } else {
      await ctx.reply(
        "Kaspi реквизитіңізді енгізіңіз (мысалы, +7XXXXXXXXXX):"
      );
      kaspiFlow.set(userId, true);
    }
  } catch (error) {
    console.error("Error in update_kaspi handler:", error);
    await ctx.reply("Қате пайда болды. Қайтадан көріңіз.");
  } finally {
    await conn.end();
  }

  await ctx.answerCbQuery(); // Acknowledge the callback to remove the loading state
});

// Handler to process user input for Kaspi
bot.on("text", async (ctx) => {
  const userId = ctx.from.id;

  if (kaspiFlow.has(userId)) {
    const input = ctx.message.text.trim();

    // Validate the input: must start with '+' followed by digits, e.g., +7XXXXXXXXXX
    const kaspiRegex = /^\+7\d{10}$/;

    if (kaspiRegex.test(input)) {
      const conn = await mysql.createConnection(DB_CONFIG);
      try {
        await conn.execute(
          "UPDATE botusers SET kaspi = ? WHERE user_id = ?",
          [input, userId]
        );
        await ctx.reply("Kaspi реквизитіңіз сәтті сақталды!");
      } catch (error) {
        console.error("Error updating Kaspi:", error);
        await ctx.reply("Қате пайда болды. Қайтадан көріңіз.");
      } finally {
        await conn.end();
        kaspiFlow.delete(userId);
      }
    } else {
      await ctx.reply(
        "Қате формат! Kaspi реквизитіңізді қайтадан енгізіңіз (мысалы, +7XXXXXXXXXX):"
      );
    }
  }
});

// Launch the bot
(async () => {
  try {
    await initDB();
    await bot.launch();
    console.log("Bot is running...");
  } catch (error) {
    console.error("Error launching the bot:", error);
  }
})();

// Graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
