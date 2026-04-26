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

// MULTI CHANNELS
const joinToCreates = [
  "1495858476155404499",
  "1495858503632552087"
];

const joinToUnmutes = [
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

    if (cmd === "send") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

      const embed = new EmbedBuilder()
        .setTitle("VoiceMaster Interface")
        .setAuthor({
          name: message.guild.name,
          iconURL: message.guild.iconURL({ dynamic: true })
        })
        .setColor("#141319")
        .setDescription(`Click the buttons below or use the commands to manage your VC.

**Buttons**
<:vc_lock:1477309124537483439> \`,vc lock\`
<:vc_unlock:1477309329433559203> \`,vc unlock\`
<:vc_hide:1477311897262096497> \`,vc hide\`
<:vc_reveal:1477311594638606336> \`,vc reveal\`
<:vc_limit:1486267107376234506> \`,vc limit\`
<:vc_kick:1477311772137619478> \`,vc kick\`
<:vc_ban:1489137904469934141> \`,vc ban\`
<:vc_permit:1486267187709607937> \`,vc permit\`
<:vc_claim:1489137213378662411> \`,vc claim\`
<:vc_info:1477312480463294628> \`,vc info`);

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

    if (cmd === "vc") {
      const sub = args[0];
      const vc = message.member.voice.channel;

      if (!vc) return message.reply({ embeds: [new EmbedBuilder().setDescription("You’re not in a **voice channel**.")] });

      const ownerId = owners.get(vc.id);

      try {
        switch (sub) {

          case "lock":
            if (ownerId !== message.member.id)
              return message.reply({ embeds: [new EmbedBuilder().setDescription("Only the owner can use vc commands.")] });

            await vc.setParent(privateCategory).catch(() => {});
            await vc.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: false });

            for (const member of vc.members.values()) {
              if (!vc.permissionOverwrites.cache.has(member.id)) {
                await vc.permissionOverwrites.edit(member, { Connect: true });
              }
            }

            message.reply({ embeds: [new EmbedBuilder().setDescription("Your **voice channel** has been locked.")] });
            break;

          case "unlock":
            if (ownerId !== message.member.id)
              return message.reply({ embeds: [new EmbedBuilder().setDescription("Only the owner can use vc commands.")] });

            await vc.setParent(publicCategory).catch(() => {});
            await vc.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: true });

            message.reply({ embeds: [new EmbedBuilder().setDescription("Your **voice channel** has been unlocked.")] });
            break;

          case "hide":
            if (ownerId !== message.member.id)
              return message.reply({ embeds: [new EmbedBuilder().setDescription("Only the owner can use vc commands.")] });

            await vc.setParent(privateCategory).catch(() => {});
            await vc.permissionOverwrites.edit(message.guild.roles.everyone, {
              ViewChannel: false,
              Connect: false
            });

            for (const member of vc.members.values()) {
              if (!vc.permissionOverwrites.cache.has(member.id)) {
                await vc.permissionOverwrites.edit(member, { ViewChannel: true, Connect: true });
              }
            }

            message.reply({ embeds: [new EmbedBuilder().setDescription("Your **voice channel** has been hidden.")] });
            break;

          case "reveal":
            if (ownerId !== message.member.id)
              return message.reply({ embeds: [new EmbedBuilder().setDescription("Only the owner can use vc commands.")] });

            await vc.setParent(publicCategory).catch(() => {});
            await vc.permissionOverwrites.edit(message.guild.roles.everyone, {
              ViewChannel: true,
              Connect: true
            });

            message.reply({ embeds: [new EmbedBuilder().setDescription("Your **voice channel** is now visible.")] });
            break;

          case "limit":
            if (ownerId !== message.member.id)
              return message.reply({ embeds: [new EmbedBuilder().setDescription("Only the owner can use vc commands.")] });

            const limit = Number(args[1]);

            if (!Number.isInteger(limit) || limit < 0 || limit > 99) {
              return message.reply({ embeds: [new EmbedBuilder().setDescription("Provide a valid number (0-99).")] });
            }

            if (vc.userLimit !== limit) {
              await vc.setUserLimit(limit);
            }

            message.reply({ embeds: [new EmbedBuilder().setDescription(`User limit set to **${limit}**.`)] });
            break;

          case "kick":
            if (ownerId !== message.member.id)
              return message.reply({ embeds: [new EmbedBuilder().setDescription("Only the owner can use vc commands.")] });

            const kickMember = message.mentions.members.first();
            if (!kickMember || kickMember.voice.channel?.id !== vc.id)
              return message.reply("Cannot kick this user.");

            if (kickMember.voice.channelId === vc.id) {
              await kickMember.voice.disconnect().catch(() => {});
            }

            message.reply({ embeds: [new EmbedBuilder().setDescription(`**${kickMember.user.username}** has been kicked.`)] });
            break;

          case "ban":
            if (ownerId !== message.member.id)
              return message.reply({ embeds: [new EmbedBuilder().setDescription("Only the owner can use vc commands.")] });

            const banMember = message.mentions.members.first();
            if (!banMember) return message.reply("Mention a user.");

            await vc.permissionOverwrites.edit(banMember, { Connect: false }).catch(() => {});

            message.reply({ embeds: [new EmbedBuilder().setDescription(`**${banMember.user.username}** has been banned.`)] });
            break;

          case "permit":
            if (ownerId !== message.member.id)
              return message.reply({ embeds: [new EmbedBuilder().setDescription("Only the owner can use vc commands.")] });

            const permitMember = message.mentions.members.first();
            if (!permitMember) return message.reply("Mention a user.");

            await vc.permissionOverwrites.edit(permitMember, { ViewChannel: true, Connect: true }).catch(() => {});

            message.reply({ embeds: [new EmbedBuilder().setDescription(`**${permitMember.user.username}** can join.`)] });
            break;

          case "claim":
            if (ownerId && Array.from(vc.members.values()).some(m => m.id === ownerId))
              return message.reply({ embeds: [new EmbedBuilder().setDescription("Owner still in VC.")] });

            owners.set(vc.id, message.member.id);
            message.reply({ embeds: [new EmbedBuilder().setDescription("You claimed ownership.")] });
            break;

          case "info":
            const membersList = Array.from(vc.members.values()).map(m => `• ${m.displayName}`).join("\n") || "No members";
            const ownerMember = vc.guild.members.cache.get(owners.get(vc.id));

            const everyonePerms = vc.permissionOverwrites.cache.get(vc.guild.roles.everyone.id);
            const isLocked = everyonePerms?.deny?.has(PermissionsBitField.Flags.Connect);
            const isHidden = everyonePerms?.deny?.has(PermissionsBitField.Flags.ViewChannel);

            let status = "Unlocked";
            if (isHidden) status = "Hidden";
            else if (isLocked) status = "Locked";

            const embedInfo = new EmbedBuilder()
              .setTitle(`VC Info - ${vc.name}`)
              .addFields(
                { name: "Owner", value: ownerMember ? ownerMember.user.tag : "No owner", inline: true },
                { name: "Members", value: `${vc.members.size}`, inline: true },
                { name: "User Limit", value: vc.userLimit > 0 ? `${vc.userLimit}` : "No limit", inline: true },
                { name: "Status", value: status, inline: true },
                { name: "Member List", value: membersList }
              );

            message.channel.send({ embeds: [embedInfo] });
            break;
        }
      } catch (err) {
        console.error(err);
      }
    }
  });

  // =========================
  // VOICE STATE
  // =========================
  client.on("voiceStateUpdate", async (oldState, newState) => {

    // JOIN TO CREATE
    if (joinToCreates.includes(newState.channelId)) {
      const vc = await newState.guild.channels.create({
        name: `${newState.member.displayName}'s channel`,
        type: ChannelType.GuildVoice,
        parent: publicCategory
      }).catch(() => null);

      if (!vc) return;

      owners.set(vc.id, newState.member.id);
      await newState.member.voice.setChannel(vc).catch(() => {});
      return;
    }

    // JOIN TO UNMUTE
    if (joinToUnmutes.includes(newState.channelId)) {

      if (tempVCs.get(newState.member.id) === "processing") return;
      if (!oldState.channel) return;

      tempVCs.set(newState.member.id, "processing");

      try {
        const originalVC = oldState.channel;

        await newState.member.voice.setMute(false).catch(() => {});
        await new Promise(res => setTimeout(res, 500));

        if (originalVC && originalVC.type === ChannelType.GuildVoice) {
          await newState.member.voice.setChannel(originalVC).catch(() => {});
        }

      } catch (err) {
        console.error(err);
      }

      setTimeout(() => tempVCs.delete(newState.member.id), 3000);
    }

    // DELETE EMPTY
    if (oldState.channel) {
      const channel = oldState.channel;

      if (![publicCategory, privateCategory].includes(channel.parentId)) return;

      if (
        joinToCreates.includes(channel.id) ||
        joinToUnmutes.includes(channel.id)
      ) return;

      // transfer ownership
      const currentOwner = owners.get(channel.id);
      if (currentOwner && !channel.members.has(currentOwner)) {
        const next = channel.members.first();
        if (next) owners.set(channel.id, next.id);
      }

      if (channel.members.size === 0) {
        owners.delete(channel.id);
        channel.delete().catch(() => {});
      }
    }

    if (oldState.channelId && !newState.guild.channels.cache.get(oldState.channelId)) {
      owners.delete(oldState.channelId);
    }
  });
};
