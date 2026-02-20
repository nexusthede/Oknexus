const { EmbedBuilder } = require("discord.js");
const config = require("./config");

let chatLB = new Map();
let vcLB = new Map();

function createEmbed(title, lbMap){
  const arr = Array.from(lbMap.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);
  let desc="";
  const medals=["🥇","🥈","🥉"];
  arr.forEach((entry,i)=>{
    const rank = i<3 ? medals[i] : `**${i+1}.**`;
    desc+=`${rank} <@${entry[0]}> — ${entry[1]} msgs\n`;
  });
  if(!desc) desc="No activity yet this week.";
  return new EmbedBuilder()
    .setTitle(title)
    .setColor("#000001")
    .setDescription(desc)
    .setFooter({ text:"Updates every 10 mins • Resets weekly" });
}

module.exports = {
  addChat:(userId)=>{ chatLB.set(userId,(chatLB.get(userId)||0)+1); },
  addVC:(userId,time=1)=>{ vcLB.set(userId,(vcLB.get(userId)||0)+time); },
  executeChat:(client)=>{
    if(!config.CHAT_LB_CHANNEL) return;
    const guild = client.guilds.cache.get(config.ALLOWED_GUILD);
    if(!guild) return;
    const ch = guild.channels.cache.get(config.CHAT_LB_CHANNEL);
    if(!ch) return;
    ch.send({ embeds:[createEmbed("Weekly Chat Leaderboard", chatLB)] });
  },
  executeVC:(client)=>{
    if(!config.VC_LB_CHANNEL) return;
    const guild = client.guilds.cache.get(config.ALLOWED_GUILD);
    if(!guild) return;
    const ch = guild.channels.cache.get(config.VC_LB_CHANNEL);
    if(!ch) return;
    ch.send({ embeds:[createEmbed("Weekly VC Leaderboard", vcLB)] });
  },
  setupChat: async(message)=>{
    const embed = createEmbed("Weekly Chat Leaderboard", chatLB);
    await message.channel.send({ embeds:[embed] });
    message.channel.send("✅ Weekly Chat Leaderboard initialized.");
  },
  setupVC: async(message)=>{
    const embed = createEmbed("Weekly VC Leaderboard", vcLB);
    await message.channel.send({ embeds:[embed] });
    message.channel.send("✅ Weekly VC Leaderboard initialized.");
  }
};