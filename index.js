const { Client, GatewayIntentBits, Partials } = require("discord.js");
const express = require("express");
const config = require("./config");
const welcome = require("./welcome"); // Only welcome module

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

// Express ping for hosting
const app = express();
app.get("/", (req, res) => res.send("Bot online"));
app.listen(config.PORT);

// Welcome message
client.on("guildMemberAdd", async (member) => {
  if (member.guild.id !== config.ALLOWED_GUILD) return;
  await welcome.handleJoin(member);
});

// Ready event
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Log in
client.login(config.TOKEN);
