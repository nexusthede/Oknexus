const {
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

// =========================
// STORAGE
// =========================
const owners = new Map();
const tempVCs = new Map();
const cooldown = new Set();
const limitAwait = new Map();

// =========================
// CHANNEL IDS
// =========================
const joinToCreate1 = "1487716309155451100";
const joinToCreate2 = "1493747117297238056";

const joinToUnmute1 = "1488780563459477505";
const joinToUnmute2 = "1493746784835731678";

const publicCategory = "1488684928039256165";
const privateCategory = "1488779858443108353";

// =========================
// MAIN EXPORT
// =========================
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
        .setTitle("VoiceMaster Panel")
        .setColor("#141319")
        .setDescription("VC Control System");

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("vc_lock").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_unlock").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_hide").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_reveal").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_limit").setStyle(ButtonStyle.Secondary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("vc_kick").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_ban").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_permit").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_claim").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_info").setStyle(ButtonStyle.Secondary)
      );

      return message.channel.send({ embeds: [embed], components: [row1, row2] });
    }

    // =========================
    // VC COMMANDS
    // =========================
    if (cmd === "vc") {
      const sub = args[0];
      const vc = message.member.voice.channel;
      if (!vc) return message.reply("Join a VC.");

      const ownerId = owners.get(vc.id);

      // cooldown
      if (cooldown.has(message.member.id)) return;
      cooldown.add(message.member.id);
      setTimeout(() => cooldown.delete(message.member.id), 2000);

      try {

        // ===== LOCK =====
        if (sub === "lock") {
          if (ownerId !== message.member.id) return message.reply("Not owner.");

          await vc.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: false });

          for (const m of vc.members.values()) {
            await vc.permissionOverwrites.edit(m.id, { Connect: true }).catch(() => {});
          }

          return message.reply("VC locked.");
        }

        // ===== UNLOCK =====
        if (sub === "unlock") {
          if (ownerId !== message.member.id) return message.reply("Not owner.");

          await vc.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: true });
          return message.reply("VC unlocked.");
        }

        // ===== HIDE =====
        if (sub === "hide") {
          if (ownerId !== message.member.id) return message.reply("Not owner.");

          await vc.permissionOverwrites.edit(message.guild.roles.everyone, {
            ViewChannel: false,
            Connect: false
          });

          for (const m of vc.members.values()) {
            await vc.permissionOverwrites.edit(m.id, {
              ViewChannel: true,
              Connect: true
            }).catch(() => {});
          }

          return message.reply("VC hidden.");
        }

        // ===== REVEAL =====
        if (sub === "reveal") {
          if (ownerId !== message.member.id) return message.reply("Not owner.");

          await vc.permissionOverwrites.edit(message.guild.roles.everyone, {
            ViewChannel: true,
            Connect: true
          });

          return message.reply("VC revealed.");
        }

        // ===== LIMIT (FIXED) =====
        if (sub === "limit") {
          if (ownerId !== message.member.id) return message.reply("Not owner.");

          const limit = parseInt(args[1]);
          if (isNaN(limit) || limit < 0 || limit > 99)
            return message.reply("Use 0-99.");

          await vc.edit({ userLimit: limit });
          return message.reply(`Limit set to ${limit}`);
        }

      } catch (e) {
        console.error(e);
        message.reply("Error.");
      }
    }

    // =========================
    // LIMIT BUTTON INPUT
    // =========================
    if (limitAwait.has(message.author.id)) {
      const vcId = limitAwait.get(message.author.id);
      const vc = message.guild.channels.cache.get(vcId);

      const limit = parseInt(message.content);
      if (isNaN(limit) || limit < 0 || limit > 99)
        return message.reply("Invalid number 0-99.");

      await vc.edit({ userLimit: limit }).catch(() => {});
      limitAwait.delete(message.author.id);

      return message.reply(`Limit set to ${limit}`);
    }
  });

  // =========================
  // BUTTONS
  // =========================
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    const vc = interaction.member.voice.channel;
    if (!vc) return interaction.reply({ content: "Join VC.", ephemeral: true });

    const ownerId = owners.get(vc.id);

    if (interaction.customId === "vc_limit") {
      if (ownerId !== interaction.member.id)
        return interaction.reply({ content: "Not owner", ephemeral: true });

      limitAwait.set(interaction.member.id, vc.id);

      return interaction.reply({
        content: "Send number in chat (0-99)",
        ephemeral: true
      });
    }

    if (interaction.customId === "vc_claim") {
      owners.set(vc.id, interaction.member.id);
      return interaction.reply({ content: "Claimed", ephemeral: true });
    }

    if (interaction.customId === "vc_info") {
      return interaction.reply({
        content: `VC: ${vc.name} | Members: ${vc.members.size}`,
        ephemeral: true
      });
    }
  });

  // =========================
  // VOICE SYSTEM
  // =========================
  client.on("voiceStateUpdate", async (oldState, newState) => {

    const member = newState.member;
    if (!member || member.user.bot) return;

    // ================= JOIN TO CREATE =================
    if (
      newState.channelId === joinToCreate1 ||
      newState.channelId === joinToCreate2
    ) {

      const vc = await newState.guild.channels.create({
        name: `${member.user.username}'s VC`,
        type: ChannelType.GuildVoice,
        parent: publicCategory
      }).catch(() => null);

      if (!vc) return;

      owners.set(vc.id, member.id);

      await member.voice.setChannel(vc).catch(() => {});

      setTimeout(() => {
        if (vc.members.size === 0) vc.delete().catch(() => {});
      }, 10000);

      return;
    }

    // ================= JOIN TO UNMUTE =================
    if (
      newState.channelId === joinToUnmute1 ||
      newState.channelId === joinToUnmute2
    ) {

      if (!oldState.channel) return;
      if (tempVCs.has(member.id)) return;

      tempVCs.set(member.id, true);

      try {
        await member.voice.setMute(false).catch(() => {});
        await new Promise(r => setTimeout(r, 500));

        await member.voice.setChannel(oldState.channel).catch(() => {});
      } catch (e) {
        console.error(e);
      }

      setTimeout(() => tempVCs.delete(member.id), 3000);
    }

    // ================= AUTO DELETE VC =================
    if (oldState.channel) {
      const ch = oldState.channel;

      if ([publicCategory, privateCategory].includes(ch.parentId)) {
        if (ch.members.size === 0) {
          owners.delete(ch.id);
          setTimeout(() => ch.delete().catch(() => {}), 1500);
        }
      }
    }

    // ================= CLEAN OWNERS =================
    if (oldState.channelId && !oldState.guild.channels.cache.has(oldState.channelId)) {
      owners.delete(oldState.channelId);
    }
  });
};
