const { EmbedBuilder } = require("discord.js");
const config = require("./config");

let chatLB = new Map();
let vcLB = new Map();

let chatMsgId = null;
let vcMsgId = null;

// embed generator
function createEmbed(title,map,type){
  const sorted = [...map.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0,10);

  const medals = ["🥇","🥈","🥉"];

  const desc = sorted.length
    ? sorted.map((u,i)=>{
        const rank = i<3 ? medals[i] : `**${i+1}.**`;
        const label = type==="vc" ? "mins" : "msgs";
        return `${rank} <@${u[0]}> — ${u[1]} ${label}`;
      }).join("\n")
    : "No activity yet this week.";

  return new EmbedBuilder()
    .setColor("#000001")
    .setTitle(title)
    .setDescription(desc)
    .setFooter({ text:"Updates every 10 mins • Resets weekly" });
}

// send or edit message safely
async function updateMessage(channel,msgId,embed){
  try{
    if(msgId){
      const msg = await channel.messages.fetch(msgId);
      await msg.edit({ embeds:[embed] });
      return msg.id;
    }else{
      const msg = await channel.send({ embeds:[embed] });
      return msg.id;
    }
  }catch{
    const msg = await channel.send({ embeds:[embed] });
    return msg.id;
  }
}

module.exports = {

  addChat(id){
    chatLB.set(id,(chatLB.get(id)||0)+1);
  },

  addVC(id,time=1){
    vcLB.set(id,(vcLB.get(id)||0)+time);
  },

  async executeChat(client){
    if(!config.CHAT_LB_CHANNEL) return;

    const guild = client.guilds.cache.get(config.ALLOWED_GUILD);
    if(!guild) return;

    const ch = guild.channels.cache.get(config.CHAT_LB_CHANNEL);
    if(!ch) return;

    const embed = createEmbed("Weekly Chat Leaderboard",chatLB,"chat");
    chatMsgId = await updateMessage(ch,chatMsgId,embed);
  },

  async executeVC(client){
    if(!config.VC_LB_CHANNEL) return;

    const guild = client.guilds.cache.get(config.ALLOWED_GUILD);
    if(!guild) return;

    const ch = guild.channels.cache.get(config.VC_LB_CHANNEL);
    if(!ch) return;

    const embed = createEmbed("Weekly VC Leaderboard",vcLB,"vc");
    vcMsgId = await updateMessage(ch,vcMsgId,embed);
  },

  async setupChat(message){
    const embed = createEmbed("Weekly Chat Leaderboard",chatLB,"chat");
    const msg = await message.channel.send({ embeds:[embed] });
    chatMsgId = msg.id;
  },

  async setupVC(message){
    const embed = createEmbed("Weekly VC Leaderboard",vcLB,"vc");
    const msg = await message.channel.send({ embeds:[embed] });
    vcMsgId = msg.id;
  }

};
