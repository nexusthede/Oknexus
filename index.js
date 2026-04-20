const { Client, GatewayIntentBits } = require("discord.js");
const mongoose = require("mongoose");
const express = require("express");

// =========================
// EXPRESS (HEALTH CHECK)
// =========================
const app = express();

app.get("/", (req, res) => {
  res.status(200).send("Bot is alive");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
});

// =========================
// CLIENT
// =========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// =========================
// MONGO (STABLE CONNECTION)
// =========================
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.log("MongoDB error:", err));

// =========================
// GUILD WHITELIST
// =========================
const allowedGuilds = new Set([
  "1449708401050259457",
  "1475371068507160586"
]);

// =========================
// SAFE GUILD CHECK
// =========================
client.on("guildCreate", async (guild) => {
  try {
    if (!allowedGuilds.has(guild.id)) {
      console.log(`Left unauthorized guild: ${guild.name} (${guild.id})`);
      await guild.leave();
    }
  } catch (err) {
    console.log("Guild leave error:", err);
  }
});

// =========================
// SAFE MODULE LOADING
// =========================
try {
  require("./leaderboard.js")(client);
} catch (err) {
  console.error("Failed to load leaderboard.js:", err);
}

try {
  require("./vc.js")(client);
} catch (err) {
  console.error("Failed to load vc.js:", err);
}

// =========================
// READY EVENT
// =========================
client.once("ready", () => {
  console.log(`${client.user.tag} is online`);
});

// =========================
// GLOBAL ERROR HANDLING (IMPORTANT)
// =========================
process.on("unhandledRejection", (reason) => {
  console.log("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.log("Uncaught Exception:", err);
});

// =========================
// LOGIN
// =========================
client.login(process.env.TOKEN);
