const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require("discord.js");
const express = require("express");
const config = require("./config");
const voiceMaster = require("./voiceMaster");
const leaderboard = require("./leaderboard");

const client = new Client({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ],
  partials:[Partials.Channel]
});

// Express for BetterStack ping
const app = express();
app.get("/", (req,res)=>res.send("Bot online"));
app.listen(config.PORT);

// Load VoiceMaster
voiceMaster(client);

// Ready event
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Set mobile online status
  client.user.setPresence({
    status: "online",
    activities: [{ name: "on mobile", type: 0 }],
    clientStatus: { mobile: "online" }
  });
});

// Track chat messages
client.on("messageCreate", async message=>{
  if(!message.guild || message.author.bot) return;
  if(message.guild.id !== config.ALLOWED_GUILD) return;
  if(!message.content.startsWith(config.PREFIX)) return;

  const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  // Admin-only commands
  if(message.member.permissions.has(PermissionsBitField.Flags.Administrator)){
    // ,set command
    if(cmd === "set"){
      const ch = message.mentions.channels.first();
      if(!ch) return message.reply("❌ Mention a channel.").then(msg => setTimeout(()=>msg.delete().catch(()=>{}),5000));
      if(args[0]==="chatlb"){config.CHAT_LB_CHANNEL=ch.id; return message.reply("✅ Chat LB set").then(msg => setTimeout(()=>msg.delete().catch(()=>{}),5000));}
      if(args[0]==="vclb"){config.VC_LB_CHANNEL=ch.id; return message.reply("✅ VC LB set").then(msg => setTimeout(()=>msg.delete().catch(()=>{}),5000));}
      return message.reply("Usage: ,set chatlb #channel | ,set vclb #channel").then(msg => setTimeout(()=>msg.delete().catch(()=>{}),5000));
    }

    // ,setup command
    if(cmd === "setup"){
      if(args[0]==="chat") return leaderboard.setupChat(message);
      if(args[0]==="vc") return leaderboard.setupVC(message);
      return message.reply("Usage: ,setup chat | ,setup vc").then(msg => setTimeout(()=>msg.delete().catch(()=>{}),5000));
    }

    // ,upload command
    if(cmd === "upload"){
      await leaderboard.executeChat(client);
      await leaderboard.executeVC(client);
      return message.reply("✅ Leaderboards uploaded.").then(msg => setTimeout(()=>msg.delete().catch(()=>{}),5000));
    }
  }

  // Track chat for leaderboard
  leaderboard.addChat(message.author.id);
});

// Track VC time for leaderboard
client.on("voiceStateUpdate", (oldState,newState)=>{
  if(newState.guild.id!==config.ALLOWED_GUILD) return;
  if(!oldState.channelId && newState.channelId) leaderboard.addVC(newState.id,1);
});

// Auto-update leaderboards every 10 minutes
setInterval(()=>{
  leaderboard.executeChat(client);
  leaderboard.executeVC(client);
}, 10*60*1000);

client.login(config.TOKEN);
