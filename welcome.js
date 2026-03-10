const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("./config");

module.exports = {
  handleJoin: async (member) => {
    await sendWelcome(member);
  },

  // Command to test welcome manually
  handleCommand: async (message, args) => {
    if (args[0] === "welcome") {
      await sendWelcome(message.member);
      message.delete().catch(() => {});
    }
  }
};

// Function to send welcome
async function sendWelcome(member) {
  try {
    const channel = member.guild.channels.cache.get(config.WELCOME_CHANNEL);
    if (!channel) return console.log("Welcome channel not found.");

    // Time in 12h format with AM/PM
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const timeString = `Today at ${hours}:${minutes} ${ampm}`;

    // Full description lines with emojis, clickable Rules and Roles
    const description = 
      `<:00:1481004667482935296>・Read the [Rules](https://discord.gg/3ytNyU2qtj)\n` +
      `<:00:1481004667482935296>・Get some [Roles](https://discord.gg/NGAEsznEss)\n` +
      `<:00:1481004667482935296>・Invite your friends!`;

    // Embed (compact: no thumbnail)
    const embed = new EmbedBuilder()
      .setTitle(`Welcome to ${member.guild.name}`)
      .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
      .setDescription(description)
      .setFooter({ text: timeString });

    // Buttons with emojis
    const row = new ActionRowBuilder().addComponents([
      new ButtonBuilder()
        .setLabel("Chat Here")
        .setStyle(ButtonStyle.Link)
        .setEmoji("<:purple_astro:1468428523755802627>")
        .setURL("https://discord.gg/s32P9shHHa"),
      new ButtonBuilder()
        .setLabel("Create VC")
        .setStyle(ButtonStyle.Link)
        .setEmoji("<:greenflower:1468428520584777840>")
        .setURL("https://discord.gg/keGMdwE2KV")
    ]);

    // Send welcome message
    await channel.send({ content: `<@${member.id}>`, embeds: [embed], components: [row] });

  } catch (err) {
    console.error("Error sending welcome message:", err);
  }
}
