const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const db = require("./db");
const { buildVC, buildCHAT } = require("./leaderboard");

// ONLY ALLOWED SERVERS
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

// =====================
// RENDER KEEP ALIVE
// =====================
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(3000, () => {
  console.log("Keep-alive server started");
});

// =====================
// SAFETY HANDLERS
// =====================
process.on("unhandledRejection", console.log);
process.on("uncaughtException", console.log);

// =====================
// VC TRACKING
// =====================
const activeVC = new Map();
let leaderboardMessage = null;

// =====================
// AUTO LEAVE SYSTEM
// =====================
client.on("guildCreate", async (guild) => {
  if (!ALLOWED_GUILDS.includes(guild.id)) {
    console.log(`Left server: ${guild.name}`);
    await guild.leave();
  }
});

// =====================
// READY EVENT
// =====================
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // remove unauthorized servers on restart
  client.guilds.cache.forEach(async (guild) => {
    if (!ALLOWED_GUILDS.includes(guild.id)) {
      await guild.leave();
    }
  });

  const guild = client.guilds.cache.get(ALLOWED_GUILDS[0]);

  const channel = await client.channels.fetch("YOUR_CHANNEL_ID");

  const row = db.prepare(`
    SELECT * FROM settings WHERE guildId = ?
  `).get(guild.id);

  if (row?.messageId) {
    try {
      leaderboardMessage = await channel.messages.fetch(row.messageId);
    } catch {}
  }

  if (!leaderboardMessage) {
    leaderboardMessage = await channel.send({
      embeds: [
        buildVC(guild),
        buildCHAT(guild)
      ]
    });

    db.prepare(`
      INSERT INTO settings (guildId, channelId, messageId)
      VALUES (?, ?, ?)
      ON CONFLICT(guildId)
      DO UPDATE SET messageId = excluded.messageId
    `).run(guild.id, channel.id, leaderboardMessage.id);
  }

  setInterval(updateLeaderboard, 600000);
});

// =====================
// VC TRACKING
// =====================
client.on("voiceStateUpdate", (oldState, newState) => {
  const userId = newState.id;
  const guildId = newState.guild.id;

  if (!ALLOWED_GUILDS.includes(guildId)) return;

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

// =====================
// CHAT TRACKING
// =====================
client.on("messageCreate", (msg) => {
  if (!msg.guild || msg.author.bot) return;
  if (!ALLOWED_GUILDS.includes(msg.guild.id)) return;

  db.prepare(`
    INSERT INTO chat_time (guildId, userId, messages)
    VALUES (?, ?, 1)
    ON CONFLICT(guildId, userId)
    DO UPDATE SET messages = messages + 1
  `).run(msg.guild.id, msg.author.id);
});

// =====================
// LEADERBOARD UPDATE
// =====================
async function updateLeaderboard() {
  if (!leaderboardMessage) return;

  try {
    const guild = leaderboardMessage.guild;

    await leaderboardMessage.edit({
      embeds: [
        buildVC(guild),
        buildCHAT(guild)
      ]
    });
  } catch (err) {
    console.log("Leaderboard update failed:", err.message);
  }
}

// =====================
// LOGIN (RENDER TOKEN FIX)
// =====================
if (!process.env.TOKEN) {
  console.log("ERROR: Missing TOKEN in environment variables");
  process.exit(1);
}

client.login(process.env.TOKEN);
