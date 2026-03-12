const { Client, GatewayIntentBits, Partials } = require("discord.js");
const express = require("express");
const config = require("./config");
const voiceMaster = require("./voiceMaster"); // your VC module

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

// Express for BetterStack ping
const app = express();
app.get("/", (req, res) => res.send("Bot online"));
app.listen(config.PORT, () => console.log(`Bot running on port ${config.PORT}`));

// Welcome system
client.on("guildMemberAdd", async (member) => {
  if (member.guild.id !== config.ALLOWED_GUILD) return;
  if (typeof require("./welcome").handleJoin === "function") {
    await require("./welcome").handleJoin(member);
  }
});

// Command handling
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  // Pass to VoiceMaster commands
  if (message.content.startsWith(config.PREFIX)) {
    await voiceMaster.execute(client, message);
  }
});

// Setup voice listeners for join-to-create, buttons, etc.
voiceMaster.setupVoiceListeners(client);

// Login bot
client.login(config.TOKEN);
