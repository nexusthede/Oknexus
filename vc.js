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

// RATE LIMIT
function isRateLimited(userId, ms = 3000) {
  const now = Date.now();
  const last = rateLimit.get(userId);
  if (last && now - last < ms) return true;
  rateLimit.set(userId, now);
  return false;
}

module.exports = (client) => {

  // =========================
  // MESSAGE COMMANDS
  // =========================
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(".")) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // SEND PANEL
    if (cmd === "send") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

      const embed = new EmbedBuilder()
        .setTitle("VoiceMaster Interface")
        .setAuthor({
          name: message.guild.name,
          iconURL: message.guild.iconURL({ dynamic: true })
        })
        .setColor("#141319")
        .setDescription(
`Use the buttons below to mange your voice channel.

**Buttons**
<:vc_lock:1477309124537483439> — [\`Lock\`](https://discord.gg/gHnxSMGfR) the voice channel  
<:vc_unlock:1477309329433559203> — [\`Unlock\`](https://discord.gg/gHnxSMGfR) the voice channel  
<:vc_hide:1477311897262096497> — [\`Hide\`](https://discord.gg/gHnxSMGfR) the voice channel  
<:vc_reveal:1477311594638606336> — [\`Reveal\`](https://discord.gg/gHnxSMGfR) the voice channel  
<:vc_limit:1486267107376234506> — [\`Limit\`](https://discord.gg/gHnxSMGfR) set the user limit  
<:vc_kick:1477311772137619478> — [\`Kick\`](https://discord.gg/gHnxSMGfR) a user  
<:vc_ban:1489137904469934141> — [\`Ban\`](https://discord.gg/gHnxSMGfR) a user  
<:vc_permit:1486267187709607937> — [\`Permit\`](https://discord.gg/gHnxSMGfR) a user  
<:vc_claim:1489137213378662411> — [\`Claim\`](https://discord.gg/gHnxSMGfR) the voice channel  
<:vc_info:1477312480463294628> — [\`Info\`](https://discord.gg/gHnxSMGfR) the voice channel`
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

    // VC COMMANDS
    if (cmd === "vc") {

      if (isRateLimited(message.member.id)) {
        return message.reply({ embeds: [new EmbedBuilder().setDescription("Slow down.")] });
      }

      const sub = args[0];
      const vc = message.member.voice.channel;

      if (!vc) return message.reply({ embeds: [new EmbedBuilder().setDescription("You’re not in a **voice channel**.")] });

      const ownerId = owners.get(vc.id) || null;

      try {
        switch (sub) {

          case "lock":
            if (ownerId !== message.member.id) return message.reply({ embeds: [new EmbedBuilder().setDescription("Only the owner can use vc commands.")] });
            await vc.setParent(privateCategory).catch(() => {});
            await vc.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: false });
            for (const member of vc.members.values()) await vc.permissionOverwrites.edit(member, { Connect: true });
            message.reply({ embeds: [new EmbedBuilder().setDescription("Your **voice channel** has been locked.")] });
            break;

          case "unlock":
            if (ownerId !== message.member.id) return message.reply({ embeds: [new EmbedBuilder().setDescription("Only the owner can use vc commands.")] });
            await vc.setParent(publicCategory).catch(() => {});
            await vc.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: true });
            message.reply({ embeds: [new EmbedBuilder().setDescription("Your **voice channel** has been unlocked.")] });
            break;

          case "hide":
            if (ownerId !== message.member.id) return message.reply({ embeds: [new EmbedBuilder().setDescription("Only the owner can use vc commands.")] });
            await vc.setParent(privateCategory).catch(() => {});
            await vc.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false, Connect: false });
            for (const member of vc.members.values()) await vc.permissionOverwrites.edit(member, { ViewChannel: true, Connect: true });
            message.reply({ embeds: [new EmbedBuilder().setDescription("Your **voice channel** has been hidden.")] });
            break;

          case "reveal":
            if (ownerId !== message.member.id) return message.reply({ embeds: [new EmbedBuilder().setDescription("Only the owner can use vc commands.")] });
            await vc.setParent(publicCategory).catch(() => {});
            await vc.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: true, Connect: true });
            message.reply({ embeds: [new EmbedBuilder().setDescription("Your **voice channel** is now visible.")] });
            break;

          case "limit":
            if (ownerId !== message.member.id) return message.reply({ embeds: [new EmbedBuilder().setDescription("Only the owner can use vc commands.")] });
            const limit = Number(args[1]);
            if (!Number.isInteger(limit) || limit < 0 || limit > 99) return message.reply("Provide valid number.");
            await vc.edit({ userLimit: limit });
            message.reply({ embeds: [new EmbedBuilder().setDescription(`User limit set to **${limit}**.`)] });
            break;

          case "kick":
            if (ownerId !== message.member.id) return message.reply({ embeds: [new EmbedBuilder().setDescription("Only the owner can use vc commands.")] });
            const kickMember = message.mentions.members.first();
            if (!kickMember || kickMember.voice.channel?.id !== vc.id) return message.reply("Cannot kick this user.");
            await kickMember.voice.disconnect().catch(() => {});
            message.reply({ embeds: [new EmbedBuilder().setDescription(`**${kickMember.user.username}** has been kicked.`)] });
            break;

          case "ban":
            if (ownerId !== message.member.id) return message.reply({ embeds: [new EmbedBuilder().setDescription("Only the owner can use vc commands.")] });
            const banMember = message.mentions.members.first();
            if (!banMember) return message.reply("Mention a user.");
            await vc.permissionOverwrites.edit(banMember, { Connect: false }).catch(() => {});
            message.reply({ embeds: [new EmbedBuilder().setDescription(`**${banMember.user.username}** has been banned.`)] });
            break;

          case "permit":
            if (ownerId !== message.member.id) return message.reply({ embeds: [new EmbedBuilder().setDescription("Only the owner can use vc commands.")] });
            const permitMember = message.mentions.members.first();
            if (!permitMember) return message.reply("Mention a user.");
            await vc.permissionOverwrites.edit(permitMember, { ViewChannel: true, Connect: true }).catch(() => {});
            message.reply({ embeds: [new EmbedBuilder().setDescription(`**${permitMember.user.username}** can join.`)] });
            break;

          case "transfer":
            if (ownerId !== message.member.id) return message.reply({ embeds: [new EmbedBuilder().setDescription("Only owner can transfer.")] });
            const newOwner = message.mentions.members.first();
            if (!newOwner || newOwner.voice.channel?.id !== vc.id) return message.reply("User must be in VC.");
            owners.set(vc.id, newOwner.id);
            message.reply({ embeds: [new EmbedBuilder().setDescription(`Ownership transferred to **${newOwner.user.username}**.`)] });
            break;

          case "claim":
            if (ownerId && vc.guild.members.cache.get(ownerId)?.voice?.channelId === vc.id) {
              return message.reply({ embeds: [new EmbedBuilder().setDescription("Owner still in VC.")] });
            }
            owners.set(vc.id, message.member.id);
            message.reply({ embeds: [new EmbedBuilder().setDescription("You claimed ownership.")] });
            break;

          case "info":
            const membersList = vc.members.map(m => `• ${m.displayName}`).join("\n") || "No members";
            const ownerMember = vc.guild.members.cache.get(ownerId);

            const embedInfo = new EmbedBuilder()
              .setTitle(`VC Info - ${vc.name}`)
              .setColor("#141319")
              .addFields(
                { name: "Owner", value: ownerMember ? ownerMember.user.tag : "None", inline: true },
                { name: "Members", value: `${vc.members.size}`, inline: true },
                { name: "Limit", value: vc.userLimit > 0 ? `${vc.userLimit}` : "None", inline: true }
              );

            message.channel.send({ embeds: [embedInfo] });
            break;

          case "rename":
            if (ownerId !== message.member.id) return message.reply({ embeds: [new EmbedBuilder().setDescription("Only owner.")] });
            const newName = args.slice(1).join(" ");
            if (!newName) return message.reply("Provide name.");
            await vc.setName(newName);
            message.reply(`Renamed to ${newName}`);
            break;

          default:
            message.reply("Unknown command.");
        }
      } catch (err) {
        console.error(err);
      }
    }
  });

  // =========================
  // VOICE STATE UPDATE
  // =========================
  client.on("voiceStateUpdate", async (oldState, newState) => {

    // CREATE
    if (joinToCreate.includes(newState.channelId)) {

      if (activeCreateCooldown.has(newState.member.id)) return;

      activeCreateCooldown.set(newState.member.id, true);

      const vc = await newState.guild.channels.create({
        name: `${newState.member.displayName}'s channel`,
        type: ChannelType.GuildVoice,
        parent: publicCategory
      }).catch(() => null);

      if (!vc) return;

      owners.set(vc.id, newState.member.id);
      await newState.member.voice.setChannel(vc).catch(() => {});

      setTimeout(() => {
        activeCreateCooldown.delete(newState.member.id);
      }, 5000);

      return;
    }

    // UNMUTE
    if (
      joinToUnmute.includes(newState.channelId) &&
      oldState.channel &&
      oldState.channelId !== newState.channelId
    ) {

      if (tempVCs.get(newState.member.id)) return;

      tempVCs.set(newState.member.id, true);

      try {
        await newState.member.voice.setMute(false);
        await new Promise(res => setTimeout(res, 500));
        await newState.member.voice.setChannel(oldState.channel);
      } catch (err) {}

      setTimeout(() => tempVCs.delete(newState.member.id), 5000);
    }

    // DELETE
    if (oldState.channel) {
      const channel = oldState.channel;

      if (!channel || channel.type !== ChannelType.GuildVoice) return;
      if (![publicCategory, privateCategory].includes(channel.parentId)) return;
      if (joinToCreate.includes(channel.id) || joinToUnmute.includes(channel.id)) return;

      if (channel.members.size === 0) {
        owners.delete(channel.id);
        channel.delete().catch(() => {});
      }
    }
  });
};
