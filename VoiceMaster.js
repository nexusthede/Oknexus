const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, ChannelType } = require("discord.js");
const config = require("./config");

const vcOwners = new Map();

module.exports = {
async execute(client, message) {

if (!message.content.startsWith(config.PREFIX)) return;

const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
const command = args.shift()?.toLowerCase();
const member = message.member;
const guild = message.guild;

if (command === "interface") {

if (!member.permissions.has("Administrator")) {
return message.reply({
embeds:[
new EmbedBuilder()
.setDescription("<:xx_no:1481734627193520323> Only administrators can run this command!")
]
});
}

const embed = new EmbedBuilder()
.setTitle("VoiceMaster Interface")
.setAuthor({name:guild.name,iconURL:guild.iconURL({dynamic:true})})
.setDescription(`
Use the buttons below to manage your voice channel.

**Buttons**

<:vc_lock:1477309124537483439> **Lock** your voice channel  
<:vc_unlock:1477309329433559203> **Unlock** your voice channel  
<:vc_hide:1477311897262096497> **Hide** your voice channel  
<:vc_unhide:1477311594638606336> **Reveal** your voice channel  
<:vc_rename:1477312271926431987> **Rename** your voice channel  
<:vc_decrease:1477690349366280263> **Decrease** member limit  
<:vc_increase:1477690326830287080> **Increase** member limit  
<:vc_info:1477312480463294628> **Info** about your voice channel  
<:vc_kick:1477311772137619478> **Kick** someone from your voice channel  
<:vc_claim:1477559856394403942> **Claim** ownership
`);

const row1 = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("lock").setEmoji("1477309124537483439").setStyle(ButtonStyle.Primary),
new ButtonBuilder().setCustomId("unlock").setEmoji("1477309329433559203").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("claim").setEmoji("1477559856394403942").setStyle(ButtonStyle.Secondary)
);

const row2 = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("rename").setEmoji("1477312271926431987").setStyle(ButtonStyle.Primary),
new ButtonBuilder().setCustomId("decrease").setEmoji("1477690349366280263").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("increase").setEmoji("1477690326830287080").setStyle(ButtonStyle.Primary),
new ButtonBuilder().setCustomId("info").setEmoji("1477312480463294628").setStyle(ButtonStyle.Secondary)
);

const row3 = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("hide").setEmoji("1477311897262096497").setStyle(ButtonStyle.Primary),
new ButtonBuilder().setCustomId("reveal").setEmoji("1477311594638606336").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("kick").setEmoji("1477311772137619478").setStyle(ButtonStyle.Danger)
);

return message.channel.send({embeds:[embed],components:[row1,row2,row3]});
}

},

setupVoiceListeners(client){

client.on("voiceStateUpdate",async(oldState,newState)=>{

const member=newState.member;
const guild=newState.guild;

if(newState.channelId===config.JOIN_TO_CREATE_ID){

const vc=await guild.channels.create({
name:`${member.displayName}'s channel`,
type:ChannelType.GuildVoice,
parent:config.PUBLIC_VC_CATEGORY
});

vcOwners.set(vc.id,member.id);

await member.voice.setChannel(vc);

const interval=setInterval(async()=>{

const fetched=await guild.channels.fetch(vc.id).catch(()=>null);

if(!fetched||fetched.members.size===0){

clearInterval(interval);

if(fetched)await fetched.delete().catch(()=>{});

vcOwners.delete(vc.id);

}

},5000);

}

});

client.on(Events.InteractionCreate,async interaction=>{

if(!interaction.isButton())return;

const member=interaction.member;
const action=interaction.customId;
const channel=member.voice.channel;

if(!channel){

return interaction.reply({
embeds:[
new EmbedBuilder()
.setDescription("<:xx_no:1481734627193520323> You must be in a **voice channel** to use this button!")
],
ephemeral:true
});

}

const ownerId=vcOwners.get(channel.id);

if(ownerId&&ownerId!==member.id&&action!=="claim"&&action!=="info"){

return interaction.reply({
embeds:[
new EmbedBuilder()
.setDescription("<:xx_no:1481734627193520323> You do not own this **voice channel**!")
],
ephemeral:true
});

}

try{

const msg=await performVoiceChannelAction(action,member,channel);

interaction.reply({
embeds:[new EmbedBuilder().setDescription(msg)],
ephemeral:true
});

}catch(err){

console.error(err);

interaction.reply({
embeds:[
new EmbedBuilder()
.setDescription("<:xx_no:1481734627193520323> Failed to perform this action!")
],
ephemeral:true
});

}

});

}

};

async function performVoiceChannelAction(action,member,channel){

const guild=channel.guild;

switch(action){

case "lock":

await channel.permissionOverwrites.edit(guild.roles.everyone,{connect:false});

if(config.PRIVATE_VC_CATEGORY)await channel.setParent(config.PRIVATE_VC_CATEGORY);

return "<:xx_yes:1481734672416378902> Your voice channel is now **locked**!";

case "unlock":

await channel.permissionOverwrites.edit(guild.roles.everyone,{connect:true});

if(config.PUBLIC_VC_CATEGORY)await channel.setParent(config.PUBLIC_VC_CATEGORY);

return "<:xx_yes:1481734672416378902> Your voice channel is now **unlocked**!";

case "hide":

await channel.permissionOverwrites.edit(guild.roles.everyone,{viewChannel:false});

if(config.PRIVATE_VC_CATEGORY)await channel.setParent(config.PRIVATE_VC_CATEGORY);

return "<:xx_yes:1481734672416378902> Your voice channel is now **hidden**!";

case "reveal":

await channel.permissionOverwrites.edit(guild.roles.everyone,{viewChannel:true});

if(config.PUBLIC_VC_CATEGORY)await channel.setParent(config.PUBLIC_VC_CATEGORY);

return "<:xx_yes:1481734672416378902> Your voice channel is now **visible**!";

case "increase":

await channel.setUserLimit(channel.userLimit+1);

return "<:xx_yes:1481734672416378902> Member limit increased!";

case "decrease":

await channel.setUserLimit(channel.userLimit-1);

return "<:xx_yes:1481734672416378902> Member limit decreased!";

case "info":

return `<:xx_yes:1481734672416378902> Members: ${channel.members.size}/${channel.userLimit}`;

case "claim":

vcOwners.set(channel.id,member.id);

return "<:xx_yes:1481734672416378902> You now own this voice channel!";

default:

return "<:xx_no:1481734627193520323> Unknown action!";

}

}
