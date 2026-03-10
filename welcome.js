const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("./config");

const WELCOME_CHANNEL = "1478693017559765063";

// random embed color
function randomColor() {
  return Math.floor(Math.random() * 16777215);
}

// format time like "Today at 9:14 AM"
function getTime() {
  const now = new Date();
  return now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

async function handleJoin(member) {
  if (!member.guild) return;
  if (member.guild.id !== config.ALLOWED_GUILD) return;

  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(randomColor())
    .setAuthor({
      name: member.user.username,
      iconURL: member.user.displayAvatarURL({ dynamic: true }),
    })
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setDescription(
`Welcome to **${member.guild.name}**

・Read our [Rules](https://discord.gg/3ytNyU2qtj)
・Get some [Roles](https://discord.gg/NGAEsznEss)
・Invite your friends!`
    )
    .setFooter({
      text: `Today at ${getTime()}`
    });

  const chatButton = new ButtonBuilder()
    .setLabel("Chat Here")
    .setStyle(ButtonStyle.Secondary)
    .setURL("https://discord.gg/s32P9shHHa");

  const vcButton = new ButtonBuilder()
    .setLabel("Create VC")
    .setStyle(ButtonStyle.Secondary)
    .setURL("https://discord.gg/keGMdwE2KV");

  const row = new ActionRowBuilder().addComponents(chatButton, vcButton);

  await channel.send({
    content: `<@${member.id}>`,
    embeds: [embed],
    components: [row],
  }).catch(() => {});
}

module.exports = {
  handleJoin
};
