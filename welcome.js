const { EmbedBuilder } = require("discord.js");
const config = require("./config");

module.exports = {
  handleJoin: async (member) => {
    try {
      const channel = member.guild.channels.cache.get(config.WELCOME_CHANNEL);
      if (!channel) return console.log("Welcome channel not found.");

      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12; // convert 0 -> 12
      const timeString = `Today at ${hours}:${minutes} ${ampm}`;

      const embed = new EmbedBuilder()
        .setTitle(`Welcome to ${member.guild.name} <:lunas_moon:1468428526683295745>`)
        .setAuthor({
          name: member.user.username,
          iconURL: member.user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `<:00:1481004667482935296>・[Read the Rules](https://discord.gg/3ytNyU2qtj)\n` +
          `<:00:1481004667482935296>・[Get some Roles](https://discord.gg/NGAEsznEss)\n` +
          `<:00:1481004667482935296>・Invite your friends!`
        )
        .setFooter({ text: timeString });
        // Plain default embed color

      await channel.send({ content: `<@${member.id}>`, embeds: [embed] });

    } catch (err) {
      console.error("Error sending welcome message:", err);
    }
  }
};
