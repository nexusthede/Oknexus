const { Client, GatewayIntentBits } = require("discord.js");
const mongoose = require("mongoose");

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
// MONGO CONNECT (RENDER ENV)
// =========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB error:", err));

// =========================
// GUILD WHITELIST (YOUR SERVERS ONLY)
// =========================
const allowedGuilds = [
  "1449708401050259457",
  "1475371068507160586"
];

// =========================
// AUTO LEAVE UNAUTHORIZED SERVERS
// =========================
client.on("guildCreate", async (guild) => {

  if (!allowedGuilds.includes(guild.id)) {

    console.log(`Left unauthorized guild: ${guild.name} (${guild.id})`);

    try {
      await guild.leave();
    } catch (err) {
      console.log("Failed to leave guild:", err);
    }
  }

});

// =========================
// LOAD SYSTEM FILES
// =========================
require("./leaderboard.js")(client);
require("./vc.js")(client);

// =========================
// READY EVENT
// =========================
client.once("ready", () => {
  console.log(`${client.user.tag} is online`);
});

// =========================
// LOGIN
// =========================
client.login(process.env.TOKEN);
