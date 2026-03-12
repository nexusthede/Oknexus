const { Client, GatewayIntentBits, Partials } = require("discord.js");
const express = require("express");
const config = require("./config");
const welcome = require("./welcome");
const VoiceMaster = require("./VoiceMaster");

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
  await welcome.handleJoin(member);
});

// --------------------------
// VoiceMaster command listener
// --------------------------
client.on("messageCreate", async (message) => {
  if (message.guild?.id !== config.ALLOWED_GUILD) return;
  if (message.author.bot) return;

  await VoiceMaster.execute(client, message);
});

// --------------------------
// VoiceMaster voice listeners
// --------------------------
VoiceMaster.setupVoiceListeners(client);

// Login
client.login(config.TOKEN);
