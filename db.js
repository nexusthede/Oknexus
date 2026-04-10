console.log("🚀 BOT STARTING...");

const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const db = require("./db");
const { handleCommands } = require("./leaderboard");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// EXPRESS (Render KEEP ALIVE)
const app = express();
app.get("/", (req, res) => res.send("OK"));

app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Web running");
});

// SAFETY (CRASH DETECTION)
process.on("unhandledRejection", (e) => console.log("UNHANDLED:", e));
process.on("uncaughtException", (e) => console.log("CRASH:", e));

// VC TRACKING
const activeVC = new Map();

// READY
client.once("ready", () => {
  console.log("✅ LOGGED IN:", client.user.tag);
});

// VC
client.on("voiceStateUpdate", (oldState, newState) => {
  if (!newState.guild) return;

  const userId = newState.id;
  const guildId = newState.guild.id;

  if (!oldState.channel && newState.channel) {
    activeVC.set(userId, Date.now());
  }

  if (oldState.channel && !newState.channel) {
    const start = activeVC.get(userId);
    if (!start) return;

    const time = Math.floor((Date.now() - start) / 1000);

    db.run(`
      INSERT OR REPLACE INTO vc_time (guildId, userId, time)
      VALUES (?, ?, COALESCE((SELECT time FROM vc_time WHERE guildId=? AND userId=?),0)+?)
    `, [guildId, userId, guildId, userId, time]);

    activeVC.delete(userId);
  }
});

// CHAT + COMMANDS
client.on("messageCreate", (msg) => {
  if (!msg.guild || msg.author.bot) return;

  handleCommands(msg);

  db.run(`
    INSERT OR REPLACE INTO chat_time (guildId, userId, messages)
    VALUES (?, ?, COALESCE((SELECT messages FROM chat_time WHERE guildId=? AND userId=?),0)+1)
  `, [msg.guild.id, msg.author.id, msg.guild.id, msg.author.id]);
});

// LOGIN (THIS IS YOUR MAIN FIX)
if (!process.env.TOKEN) {
  console.log("❌ TOKEN MISSING");
  process.exit(1);
}

client.login(process.env.TOKEN)
  .then(() => console.log("🔐 LOGIN SUCCESS"))
  .catch(err => console.log("❌ LOGIN ERROR:", err));
