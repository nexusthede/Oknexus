const { Client, GatewayIntentBits, Partials } = require("discord.js");
const express = require("express");
const config = require("./config");

// Import modules
const welcome = require("./welcome");
const leaderboard = require("./leaderboard");
const voiceMaster = require("./voiceMaster");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

// Express ping for hosting
const app = express();
app.get("/", (req, res) => res.send("Bot online"));
app.listen(config.PORT);

// Load VoiceMaster
voiceMaster(client);

// Welcome event
client.on("guildMemberAdd", async (member) => {
  try {
    if (member.guild.id !== config.ALLOWED_GUILD) return;
    await welcome.handleJoin(member);
  } catch (err) {
    console.error("Error sending welcome message:", err);
  }
});

// MessageCreate event for leaderboard commands (handled inside leaderboard.js)
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (message.guild.id !== config.ALLOWED_GUILD) return;

  if (message.content.startsWith(config.PREFIX)) {
    leaderboard.handleLeaderboardCommands(message);
  }

  // Track chat messages automatically
  leaderboard.trackMessage(message);
});

// VoiceStateUpdate for VC tracking
client.on("voiceStateUpdate", (oldState, newState) => {
  if (newState.guild.id !== config.ALLOWED_GUILD) return;

  // Track VC minutes in leaderboard
  if (!oldState.channelId && newState.channelId) {
    leaderboard.trackVoice(newState.id, 1);
  }
});

// Ready event
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(config.TOKEN);
