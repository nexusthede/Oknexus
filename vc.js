const {
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const owners = new Map();
const cooldowns = new Map();

const joinToCreate = "1487716309155451100";
const joinToUnmute = "1488780563459477505";

const publicCategory = "1488684928039256165";
const privateCategory = "1488779858443108353";

const COOLDOWN = 3000;

module.exports = (client) => {

  const checkCooldown = (userId, action) => {
    const key = `${userId}:${action}`;
    const now = Date.now();

    if (cooldowns.has(key)) {
      const expire = cooldowns.get(key);
      if (now < expire) return true;
    }

    cooldowns.set(key, now + COOLDOWN);
    return false;
  };

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(",")) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift()?.toLowerCase();
    if (!cmd) return;

    if (cmd === "send") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

      const embed = new EmbedBuilder()
        .setTitle("VoiceMaster Interface")
        .setAuthor({
          name: message.guild.name,
          iconURL: message.guild.iconURL({ dynamic: true })
        })
        .setColor("#141319")
        .setDescription(`Use the buttons below or commands to manage your voice channel.`);

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

    if (cmd === "vc") {
      const sub = args[0]?.toLowerCase();
      const vc = message.member.voice.channel;
      if (!vc) return message.reply("You’re not in a VC.");

      let ownerId = owners.get(vc.id);
      const isOwner = ownerId === message.member.id;

      if (checkCooldown(message.member.id, sub || "vc"))
        return message.reply("Slow down (cooldown 3s).");

      try {

        if (sub === "lock") {
          if (!isOwner) return message.reply("Only owner.");

          await vc.permissionOverwrites.edit(message.guild.roles.everyone, {
            Connect: false
          });

          return message.reply("VC locked.");
        }

        if (sub === "unlock") {
          if (!isOwner) return message.reply("Only owner.");

          await vc.permissionOverwrites.edit(message.guild.roles.everyone, {
            Connect: true
          });

          return message.reply("VC unlocked.");
        }

        if (sub === "hide") {
          if (!isOwner) return message.reply("Only owner.");

          await vc.permissionOverwrites.edit(message.guild.roles.everyone, {
            ViewChannel: false,
            Connect: false
          });

          return message.reply("VC hidden.");
        }

        if (sub === "reveal") {
          if (!isOwner) return message.reply("Only owner.");

          await vc.permissionOverwrites.edit(message.guild.roles.everyone, {
            ViewChannel: true,
            Connect: true
          });

          return message.reply("VC revealed.");
        }

        if (sub === "limit") {
          if (!isOwner) return message.reply("Only owner.");

          const limit = Number(args[1]);
          if (!Number.isInteger(limit) || limit < 0 || limit > 99)
            return message.reply("Invalid number.");

          await vc.setUserLimit(limit);
          return message.reply(`Limit set to ${limit}`);
        }

        if (sub === "kick") {
          if (!isOwner) return message.reply("Only owner.");

          const member = message.mentions.members.first();
          if (!member || member.voice.channelId !== vc.id)
            return message.reply("Invalid user.");

          await member.voice.setChannel(null);
          return message.reply(`Kicked ${member.user.username}`);
        }

        if (sub === "ban") {
          if (!isOwner) return message.reply("Only owner.");

          const member = message.mentions.members.first();
          if (!member) return message.reply("Mention user.");

          await vc.permissionOverwrites.edit(member, { Connect: false });
          return message.reply(`Banned ${member.user.username}`);
        }

        if (sub === "permit") {
          if (!isOwner) return message.reply("Only owner.");

          const member = message.mentions.members.first();
          if (!member) return message.reply("Mention user.");

          await vc.permissionOverwrites.edit(member, {
            Connect: true,
            ViewChannel: true
          });

          return message.reply(`Permitted ${member.user.username}`);
        }

        // ✅ FIXED CLAIM LOGIC
        if (sub === "claim") {
          const stillHere = ownerId && vc.members.get(ownerId);

          if (stillHere)
            return message.reply("Owner still here.");

          owners.set(vc.id, message.member.id);
          return message.reply("Claimed.");
        }

        if (sub === "info") {
          const list = [...vc.members.values()]
            .map(m => `• ${m.displayName}`)
            .join("\n") || "None";

          const embed = new EmbedBuilder()
            .setTitle(`VC Info - ${vc.name}`)
            .setColor("#141319")
            .addFields(
              { name: "Owner", value: ownerId || "None", inline: true },
              { name: "Members", value: `${vc.members.size}`, inline: true },
              { name: "Limit", value: vc.userLimit ? `${vc.userLimit}` : "No limit", inline: true },
              { name: "List", value: list }
            );

          return message.channel.send({ embeds: [embed] });
        }

      } catch (e) {
        console.error(e);
        return message.reply("Error.");
      }
    }
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    const vc = interaction.member.voice.channel;
    if (!vc)
      return interaction.reply({ content: "Not in VC.", ephemeral: true });

    let ownerId = owners.get(vc.id);
    const isOwner = ownerId === interaction.member.id;

    const action = interaction.customId;

    if (checkCooldown(interaction.member.id, action))
      return interaction.reply({ content: "Cooldown 3s.", ephemeral: true });

    try {

      if (action === "vc_lock") {
        if (!isOwner) return interaction.reply({ content: "Only owner.", ephemeral: true });

        await vc.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          Connect: false
        });

        return interaction.reply({ content: "Locked.", ephemeral: true });
      }

      if (action === "vc_unlock") {
        if (!isOwner) return interaction.reply({ content: "Only owner.", ephemeral: true });

        await vc.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          Connect: true
        });

        return interaction.reply({ content: "Unlocked.", ephemeral: true });
      }

      if (action === "vc_hide") {
        if (!isOwner) return interaction.reply({ content: "Only owner.", ephemeral: true });

        await vc.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          ViewChannel: false,
          Connect: false
        });

        return interaction.reply({ content: "Hidden.", ephemeral: true });
      }

      if (action === "vc_reveal") {
        if (!isOwner) return interaction.reply({ content: "Only owner.", ephemeral: true });

        await vc.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          ViewChannel: true,
          Connect: true
        });

        return interaction.reply({ content: "Revealed.", ephemeral: true });
      }

      // ✅ FIXED CLAIM
      if (action === "vc_claim") {
        const stillHere = ownerId && vc.members.get(ownerId);

        if (stillHere)
          return interaction.reply({ content: "Owner still here.", ephemeral: true });

        owners.set(vc.id, interaction.member.id);
        return interaction.reply({ content: "Claimed.", ephemeral: true });
      }

      if (action === "vc_info") {
        return interaction.reply({
          content: `VC: ${vc.name} | Members: ${vc.members.size}`,
          ephemeral: true
        });
      }

    } catch (e) {
      console.error(e);
      return interaction.reply({ content: "Error.", ephemeral: true });
    }
  });

  client.on("voiceStateUpdate", async (oldState) => {
    const channel = oldState.channel;
    if (!channel) return;

    setTimeout(() => {
      if (channel.members.size === 0) {
        owners.delete(channel.id);
        channel.delete().catch(() => {});
      }
    }, 2500);
  });
};
