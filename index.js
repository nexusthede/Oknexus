const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const db = require("./db");
const { buildVC, buildCHAT, handleCommands } = require("./leaderboard");

const ALLOWED_GUILDS = [
  "1449708401050259457",
  "1475371068507160586"
];

console.log("🚀 Starting bot...");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// EXPRESS (Render safe)
const app = express();
app.get("/", (req, res) => res.send("Bot is alive"));

app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Web server running");
});

// SAFETY
process.on("unhandledRejection", console.log);
process.on("uncaughtException", console.log);

// VC tracking
const activeVC = new Map();

// READY
client.once("ready", async () => {
  console.log("✅ Logged in as", client.user.tag);

  for (const g of client.guilds.cache.values()) {
    if (!ALLOWED_GUILDS.includes(g.id)) {
      await g.leave();
    }
  }

  console.log("✅ Ready complete");
});

// VC TRACKING
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

// CHAT + COMMANDS
client.on("messageCreate", (msg) => {
  if (!msg.guild || msg.author.bot) return;

  handleCommands(msg);

  if (!ALLOWED_GUILDS.includes(msg.guild.id)) return;

  db.prepare(`
    INSERT INTO chat_time (guildId, userId, messages)
    VALUES (?, ?, 1)
    ON CONFLICT(guildId, userId)
    DO UPDATE SET messages = messages + 1
  `).run(msg.guild.id, msg.author.id);
});

// LOGIN SAFE
if (!process.env.TOKEN) {
  console.log("❌ Missing TOKEN");
  process.exit(1);
}

client.login(process.env.TOKEN)
  .then(() => console.log("✅ Login success"))
  .catch(err => console.log("❌ Login failed:", err));
