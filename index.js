const { Client, GatewayIntentBits, Partials } = require("discord.js");
const express = require("express");
const config = require("./config");
const VoiceMaster = require("./VoiceMaster"); // your VC module
const welcome = require("./welcome");         // your existing welcome system

// Create client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel]
});

// Express for uptime
const app = express();
app.get("/", (req, res) => res.send("Bot online"));
app.listen(config.PORT, () => console.log(`Bot running on port ${config.PORT}`));

// Welcome system (auto)
client.on("guildMemberAdd", async (member) => {
  if (member.guild.id !== config.ALLOWED_GUILD) return;
  await welcome.handleJoin(member); // automatically uses your configured WELCOME_CHANNEL
});

// Command handling
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  if (message.content.startsWith(config.PREFIX)) {
    await VoiceMaster.execute(client, message);
  }
});

// Setup VoiceMaster listeners (join-to-create, buttons, etc.)
VoiceMaster.setupVoiceListeners(client);

// Login bot
client.login(config.TOKEN);
