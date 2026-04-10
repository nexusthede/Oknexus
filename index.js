const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const db = require("./db");
const { buildVC, buildCHAT, handleCommands } = require("./leaderboard");

// ALLOWED SERVERS ONLY
const ALLOWED_GUILDS = [
  "1449708401050259457",
  "1475371068507160586"
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ======================
// EXPRESS (Render FIX)
// ======================
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is alive");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Web server running");
});

// ======================
// SAFETY HANDLERS
// ======================
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED:", err);
});

process.on("uncaughtException", (err) => {
  console.log("CRASH:", err);
});

// ======================
// VC TRACKING
// ======================
const activeVC = new Map();

// ======================
// AUTO LEAVE SYSTEM
// ======================
client.on("guildCreate", async (guild) => {
  if (!ALLOWED_GUILDS.includes(guild.id)) {
    await guild.leave();
  }
});

// ======================
// READY EVENT (SAFE)
// ======================
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    // cleanup servers safely
    client.guilds.cache.forEach(async (g) => {
      if (!ALLOWED_GUILDS.includes(g.id)) await g.leave();
    });

    console.log("✅ Bot fully ready");
  } catch (err) {
    console.log("READY ERROR:", err.message);
  }
});

// ======================
// VC TRACKING (SAFE)
// ======================
client.on("voiceStateUpdate", (oldState, newState) => {
  if (!newState.guild) return;

  const guildId = newState.guild.id;
  if (!ALLOWED_GUILDS.includes(guildId)) return;

  const userId = newState.id;

  if (!oldState.channel && newState.channel) {
    activeVC.set(userId, Date.now());
  }

  if (oldState.channel && !newState.channel) {
    const start = activeVC.get(userId);
    if (!start) return;

    const time = Math.floor((Date.now() - start) / 1000);

    db.prepare(`
      INSERT INTO vc_time (guildId, userId, time)
      VALUES (?, ?, ?)
      ON CONFLICT(guildId, userId)
      DO UPDATE SET time = time + ?
    `).run(guildId, userId, time, time);

    activeVC.delete(userId);
  }
});

// ======================
// CHAT + COMMANDS
// ======================
client.on("messageCreate", (msg) => {
  if (!msg.guild || !msg.author) return;
  if (msg.author.bot) return;

  handleCommands(msg);

  if (!ALLOWED_GUILDS.includes(msg.guild.id)) return;

  db.prepare(`
    INSERT INTO chat_time (guildId, userId, messages)
    VALUES (?, ?, 1)
    ON CONFLICT(guildId, userId)
    DO UPDATE SET messages = messages + 1
  `).run(msg.guild.id, msg.author.id);
});

// ======================
// LEADERBOARD LOOP
// ======================
setInterval(async () => {
  try {
    console.log("Leaderboard update tick");
  } catch (err) {
    console.log("LB ERROR:", err.message);
  }
}, 600000);

// ======================
// LOGIN (RENDER SAFE)
// ======================
if (!process.env.TOKEN) {
  console.log("❌ Missing TOKEN in environment variables");
  process.exit(1);
}

client.login(process.env.TOKEN)
  .then(() => console.log("✅ Login successful"))
  .catch((err) => console.log("❌ Login failed:", err.message));
