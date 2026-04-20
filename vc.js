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
const activeCreateCooldown = new Map();
const rateLimit = new Map();

// VC IDs
const joinToCreate = [
  "1495858476155404499",
  "1495858503632552087"
];

const joinToUnmute = [
  "1488780563459477505",
  "1493746784835731678"
];

const publicCategory = "1488684928039256165";
const privateCategory = "1488779858443108353";

// =========================
// RATE LIMIT
// =========================
function isRateLimited(userId, ms = 2500) {
  const now = Date.now();
  const last = rateLimit.get(userId);
  if (last && now - last < ms) return true;
  rateLimit.set(userId, now);
  return false;
}

// =========================
// EMBED HELPER
// =========================
const embed = (text) =>
  new EmbedBuilder()
    .setColor("#141319")
    .setDescription(text);

module.exports = (client) => {

  // =========================
  // COMMANDS
  // =========================
  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.content.startsWith(".")) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // PANEL
    if (cmd === "send") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

      const panel = new EmbedBuilder()
        .setTitle("VoiceMaster Interface")
        .setColor("#141319")
        .setDescription("Use buttons to manage your **voice channel**.");

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("vc_lock").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_unlock").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_hide").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_reveal").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_limit").setStyle(ButtonStyle.Secondary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("vc_transfer").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_claim").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_info").setStyle(ButtonStyle.Secondary)
      );

      return message.channel.send({ embeds: [panel], components: [row1, row2] });
    }

    // VC COMMANDS
    if (cmd === "vc") {

      if (isRateLimited(message.member.id)) {
        return message.reply({ embeds: [embed("Slow down.")] });
      }

      const sub = args[0];
      const vc = message.member.voice.channel;
      if (!vc) return message.reply({ embeds: [embed("You’re not in a **voice channel**.")] });

      let ownerId = owners.get(vc.id);

      // auto recovery
      if (!ownerId && vc.members.size > 0) {
        owners.set(vc.id, vc.members.first().id);
        ownerId = owners.get(vc.id);
      }

      const isOwner = () => ownerId && ownerId === message.member.id;

      switch (sub) {

        case "lock":
          if (!isOwner()) return message.reply({ embeds: [embed("Only owner.")] });
          await vc.setParent(privateCategory).catch(() => {});
          await vc.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: false });
          return message.reply({ embeds: [embed("Locked.")] });

        case "unlock":
          if (!isOwner()) return message.reply({ embeds: [embed("Only owner.")] });
          await vc.setParent(publicCategory).catch(() => {});
          await vc.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: true });
          return message.reply({ embeds: [embed("Unlocked.")] });

        case "hide":
          if (!isOwner()) return message.reply({ embeds: [embed("Only owner.")] });
          await vc.permissionOverwrites.edit(message.guild.roles.everyone, {
            ViewChannel: false,
            Connect: false
          });
          return message.reply({ embeds: [embed("Hidden.")] });

        case "reveal":
          if (!isOwner()) return message.reply({ embeds: [embed("Only owner.")] });
          await vc.permissionOverwrites.edit(message.guild.roles.everyone, {
            ViewChannel: true,
            Connect: true
          });
          return message.reply({ embeds: [embed("Revealed.")] });

        case "limit":
          if (!isOwner()) return message.reply({ embeds: [embed("Only owner.")] });

          const limit = Number(args[1]);
          if (!Number.isInteger(limit) || limit < 0 || limit > 99)
            return message.reply({ embeds: [embed("0–99 only.")] });

          await vc.setUserLimit(limit);
          return message.reply({ embeds: [embed(`Limit set to **${limit}**.`)] });

        case "kick":
          if (!isOwner()) return message.reply({ embeds: [embed("Only owner.")] });

          const kick = message.mentions.members.first();
          if (!kick || kick.voice.channelId !== vc.id)
            return message.reply({ embeds: [embed("Invalid user.")] });

          await kick.voice.disconnect().catch(() => {});
          return message.reply({ embeds: [embed(`${kick.user.username} kicked.`)] });

        case "ban":
          if (!isOwner()) return message.reply({ embeds: [embed("Only owner.")] });

          const ban = message.mentions.members.first();
          if (!ban) return message.reply({ embeds: [embed("Mention user.")] });

          await vc.permissionOverwrites.edit(ban, { Connect: false });
          return message.reply({ embeds: [embed(`${ban.user.username} banned.`)] });

        case "permit":
          if (!isOwner()) return message.reply({ embeds: [embed("Only owner.")] });

          const permit = message.mentions.members.first();
          if (!permit) return message.reply({ embeds: [embed("Mention user.")] });

          await vc.permissionOverwrites.edit(permit, { Connect: true });
          return message.reply({ embeds: [embed(`${permit.user.username} permitted.`)] });

        case "move":
          if (!isOwner()) return message.reply({ embeds: [embed("Only owner.")] });

          const move = message.mentions.members.first();
          if (!move || !move.voice.channel)
            return message.reply({ embeds: [embed("Invalid user.")] });

          await move.voice.setChannel(vc);
          return message.reply({ embeds: [embed(`${move.user.username} moved.`)] });

        case "reject":
          if (!isOwner()) return message.reply({ embeds: [embed("Only owner.")] });

          const reject = message.mentions.members.first();
          if (!reject) return message.reply({ embeds: [embed("Mention user.")] });

          await vc.permissionOverwrites.edit(reject, { Connect: false });
          return message.reply({ embeds: [embed(`${reject.user.username} rejected.`)] });

        case "transfer":
          if (!isOwner()) return message.reply({ embeds: [embed("Only owner.")] });

          const newOwner = message.mentions.members.first();
          if (!newOwner || newOwner.voice.channelId !== vc.id)
            return message.reply({ embeds: [embed("Must be in VC.")] });

          owners.set(vc.id, newOwner.id);
          return message.reply({ embeds: [embed(`Ownership → **${newOwner.user.username}**`)] });

        case "claim":
          if (ownerId && vc.members.has(ownerId))
            return message.reply({ embeds: [embed("Owner still here.")] });

          owners.set(vc.id, message.member.id);
          return message.reply({ embeds: [embed("You claimed ownership.")] });

        case "rename":
          if (!isOwner()) return message.reply({ embeds: [embed("Only owner.")] });

          const name = args.slice(1).join(" ");
          if (!name) return message.reply({ embeds: [embed("Provide name.")] });

          await vc.setName(name);
          return message.reply({ embeds: [embed(`Renamed → **${name}**`)] });

        default:
          return message.reply({ embeds: [embed("Unknown command.")] });
      }
    }
  });

  // =========================
  // BUTTONS
  // =========================
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    const vc = interaction.member.voice.channel;
    if (!vc) return interaction.reply({ embeds: [embed("Not in VC.")], ephemeral: true });

    let ownerId = owners.get(vc.id);

    if (!ownerId && vc.members.size > 0) {
      owners.set(vc.id, vc.members.first().id);
      ownerId = owners.get(vc.id);
    }

    await interaction.deferReply({ ephemeral: true });

    const isOwner = () => ownerId && ownerId === interaction.member.id;

    switch (interaction.customId) {

      case "vc_lock":
        if (!isOwner()) return interaction.editReply({ embeds: [embed("Only owner.")] });
        await vc.setParent(privateCategory).catch(() => {});
        await vc.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
        return interaction.editReply({ embeds: [embed("Locked.")] });

      case "vc_unlock":
        if (!isOwner()) return interaction.editReply({ embeds: [embed("Only owner.")] });
        await vc.setParent(publicCategory).catch(() => {});
        await vc.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: true });
        return interaction.editReply({ embeds: [embed("Unlocked.")] });

      case "vc_hide":
        if (!isOwner()) return interaction.editReply({ embeds: [embed("Only owner.")] });
        await vc.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          ViewChannel: false,
          Connect: false
        });
        return interaction.editReply({ embeds: [embed("Hidden.")] });

      case "vc_reveal":
        if (!isOwner()) return interaction.editReply({ embeds: [embed("Only owner.")] });
        await vc.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          ViewChannel: true,
          Connect: true
        });
        return interaction.editReply({ embeds: [embed("Revealed.")] });

      case "vc_claim":
        if (ownerId && vc.members.has(ownerId))
          return interaction.editReply({ embeds: [embed("Owner still here.")] });

        owners.set(vc.id, interaction.member.id);
        return interaction.editReply({ embeds: [embed("Claimed.")] });

      case "vc_limit":
        return interaction.editReply({ embeds: [embed("Use .vc limit")] });

      case "vc_transfer":
        return interaction.editReply({ embeds: [embed("Use .vc transfer")] });

      case "vc_info":
        return interaction.editReply({ embeds: [embed("Use .vc info")] });

      default:
        return interaction.editReply({ embeds: [embed("Unknown button.")] });
    }
  });

  // =========================
  // VC SYSTEM
  // =========================
  client.on("voiceStateUpdate", async (oldState, newState) => {

    if (joinToCreate.includes(newState.channelId)) {

      if (activeCreateCooldown.has(newState.member.id)) return;
      activeCreateCooldown.set(newState.member.id, true);

      const vc = await newState.guild.channels.create({
        name: `${newState.member.displayName}'s VC`,
        type: ChannelType.GuildVoice,
        parent: publicCategory
      }).catch(() => null);

      if (!vc) return;

      owners.set(vc.id, newState.member.id);
      await newState.member.voice.setChannel(vc).catch(() => {});

      setTimeout(() => activeCreateCooldown.delete(newState.member.id), 5000);
    }

    if (
      joinToUnmute.includes(newState.channelId) &&
      oldState.channel &&
      oldState.channelId !== newState.channelId
    ) {
      if (tempVCs.get(newState.member.id)) return;
      tempVCs.set(newState.member.id, true);

      try {
        await newState.member.voice.setMute(false);
        await new Promise(r => setTimeout(r, 500));
        await newState.member.voice.setChannel(oldState.channel);
      } catch {}

      setTimeout(() => tempVCs.delete(newState.member.id), 5000);
    }

    if (oldState.channel) {
      const ch = oldState.channel;

      if (!ch || ch.type !== ChannelType.GuildVoice) return;
      if (![publicCategory, privateCategory].includes(ch.parentId)) return;
      if (joinToCreate.includes(ch.id) || joinToUnmute.includes(ch.id)) return;

      if (ch.members.size === 0) {
        owners.delete(ch.id);
        ch.delete().catch(() => {});
      }
    }
  });
};
