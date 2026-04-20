const {
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const owners = new Map();
const tempVCs = new Map();

// =========================
// CHANNEL IDS
// =========================
const joinToCreate = [
  "1487716309155451100",
  "1493747117297238056"
];

const joinToUnmute = [
  "1488780563459477505",
  "1493746784835731678"
];

const publicCategory = "1488684928039256165";
const privateCategory = "1488779858443108353";

module.exports = (client) => {

  // =========================
  // MESSAGE COMMANDS
  // =========================
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(",")) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // =========================
    // SEND PANEL
    // =========================
    if (cmd === "send") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

      const embed = new EmbedBuilder()
        .setTitle("VoiceMaster Interface")
        .setColor("#141319")
        .setDescription(
`Use the buttons below to mange your voice channel.

**Buttons**
<:vc_lock:1477309124537483439> — [\`Lock\`](https://discord.gg/8nsGEsn5s) the voice channel
<:vc_unlock:1477309329433559203> — [\`Unlock\`](https://discord.gg/8nsGEsn5s) the voice channel
<:vc_hide:1477311897262096497> — [\`Hide\`](https://discord.gg/8nsGEsn5s) the voice channel
<:vc_reveal:1477311594638606336> — [\`Reveal\`](https://discord.gg/8nsGEsn5s) the voice channel
<:vc_limit:1486267107376234506> — [\`Limit\`](https://discord.gg/8nsGEsn5s) set the user limit
<:vc_kick:1477311772137619478> — [\`Kick\`](https://discord.gg/8nsGEsn5s) a user
<:vc_ban:1489137904469934141> — [\`Ban\`](https://discord.gg/8nsGEsn5s) a user
<:vc_permit:1486267187709607937> — [\`Permit\`](https://discord.gg/8nsGEsn5s) a user
<:vc_claim:1489137213378662411> — [\`Claim\`](https://discord.gg/8nsGEsn5s) the voice channel
<:vc_info:1477312480463294628> — [\`Info\`](https://discord.gg/8nsGEsn5s) the voice channel`
        );

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("vc_lock").setStyle(ButtonStyle.Secondary).setEmoji("1477309124537483439"),
        new ButtonBuilder().setCustomId("vc_unlock").setStyle(ButtonStyle.Secondary).setEmoji("1477309329433559203"),
        new ButtonBuilder().setCustomId("vc_hide").setStyle(ButtonStyle.Secondary).setEmoji("1477311897262096497"),
        new ButtonBuilder().setCustomId("vc_reveal").setStyle(ButtonStyle.Secondary).setEmoji("1477311594638606336"),
        new ButtonBuilder().setCustomId("vc_limit").setStyle(ButtonStyle.Secondary).setEmoji("1486267107376234506")
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("vc_kick").setStyle(ButtonStyle.Secondary).setEmoji("1477311772137619478"),
        new ButtonBuilder().setCustomId("vc_ban").setStyle(ButtonStyle.Secondary).setEmoji("1489137904469934141"),
        new ButtonBuilder().setCustomId("vc_permit").setStyle(ButtonStyle.Secondary).setEmoji("1486267187709607937"),
        new ButtonBuilder().setCustomId("vc_claim").setStyle(ButtonStyle.Secondary).setEmoji("1489137213378662411"),
        new ButtonBuilder().setCustomId("vc_info").setStyle(ButtonStyle.Secondary).setEmoji("1477312480463294628")
      );

      return message.channel.send({ embeds: [embed], components: [row1, row2] });
    }

    // =========================
    // VC COMMANDS
    // =========================
    if (cmd === "vc") {

      const sub = args[0];
      const vc = message.member.voice.channel;
      if (!vc) return;

      const ownerId = owners.get(vc.id);

      switch (sub) {

        case "lock":
          if (ownerId !== message.member.id) return;
          await vc.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: false });
          return message.reply({
            embeds: [new EmbedBuilder().setColor("#141319").setDescription("Your **voice channel** has been locked.")]
          });

        case "unlock":
          if (ownerId !== message.member.id) return;
          await vc.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: true });
          return message.reply({
            embeds: [new EmbedBuilder().setColor("#141319").setDescription("Your **voice channel** has been unlocked.")]
          });

        case "hide":
          if (ownerId !== message.member.id) return;
          await vc.permissionOverwrites.edit(message.guild.roles.everyone, {
            ViewChannel: false,
            Connect: false
          });
          return message.reply({
            embeds: [new EmbedBuilder().setColor("#141319").setDescription("Your **voice channel** has been hidden.")]
          });

        case "reveal":
          if (ownerId !== message.member.id) return;
          await vc.permissionOverwrites.edit(message.guild.roles.everyone, {
            ViewChannel: true,
            Connect: true
          });
          return message.reply({
            embeds: [new EmbedBuilder().setColor("#141319").setDescription("Your **voice channel** is now visible.")]
          });

        case "limit": {
          if (ownerId !== message.member.id) return;

          const limit = parseInt(args[1]);
          if (isNaN(limit) || limit < 0 || limit > 99) return;

          await vc.setUserLimit(limit);

          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("#141319")
                .setDescription(`Your **voice channel** user limit has been set to **${limit}**.`)
            ]
          });
        }

        case "rename": {
          if (ownerId !== message.member.id) return;

          const name = args.slice(1).join(" ");
          if (!name) return;

          await vc.setName(name);

          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("#141319")
                .setDescription(`Your **voice channel** has been renamed to **${name}**.`)
            ]
          });
        }

        case "transfer": {
          if (ownerId !== message.member.id) return;

          const user = message.mentions.members.first();
          if (!user || user.voice.channel?.id !== vc.id) return;

          owners.set(vc.id, user.id);

          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("#141319")
                .setDescription(`Your **voice channel** ownership has been transferred to **${user.user.username}**.`)
            ]
          });
        }
      }
    }
  });

  // =========================
  // VOICE STATE SYSTEM
  // =========================
  client.on("voiceStateUpdate", async (oldState, newState) => {

    // JOIN TO CREATE
    if (joinToCreate.includes(newState.channelId)) {
      const vc = await newState.guild.channels.create({
        name: `${newState.member.displayName}'s channel`,
        type: ChannelType.GuildVoice,
        parent: publicCategory
      });

      owners.set(vc.id, newState.member.id);
      return newState.member.voice.setChannel(vc);
    }

    // JOIN TO UNMUTE
    if (joinToUnmute.includes(newState.channelId)) {
      if (tempVCs.get(newState.id) === "processing") return;

      tempVCs.set(newState.id, "processing");

      const original = oldState.channel;

      try {
        await newState.member.voice.setMute(false);
        if (original) await newState.member.voice.setChannel(original);
      } catch {}

      setTimeout(() => tempVCs.delete(newState.id), 3000);
    }

    // AUTO DELETE VC
    if (oldState.channel && oldState.channel.members.size === 0) {
      owners.delete(oldState.channel.id);
      oldState.channel.delete().catch(() => {});
    }
  });
};
