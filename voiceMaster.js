const { ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config");

const voiceMaster = (client) => {
  const dataPath = path.join(__dirname, "vcData.json");
  let vcData = { vcOwners: {}, tempVCs: {} };
  if (fs.existsSync(dataPath)) vcData = JSON.parse(fs.readFileSync(dataPath));

  const saveData = () => fs.writeFileSync(dataPath, JSON.stringify(vcData, null, 2));

  const embedMsg = (desc) => new EmbedBuilder().setColor("#000001").setDescription(desc);

  // JOIN TO CREATE & VC cleanup
  client.on("voiceStateUpdate", async (oldState, newState) => {
    try {
      const userId = newState.id;

      // Create VC
      if (!oldState.channelId && newState.channelId === config.JOIN_TO_CREATE_ID) {
        if (vcData.tempVCs[userId]) return;
        if (!newState.guild.members.me.permissions.has([
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.MoveMembers
        ])) return;

        const vc = await newState.guild.channels.create({
          name: `${newState.member.displayName.toLowerCase()}'s channel`,
          type: ChannelType.GuildVoice,
          parent: config.CATEGORY_ID,
          userLimit: 10
        });

        vcData.tempVCs[userId] = vc.id;
        vcData.vcOwners[vc.id] = userId;
        await newState.member.voice.setChannel(vc).catch(() => { });
        saveData();
      }

      // Delete empty VC
      if (oldState.channelId && vcData.vcOwners[oldState.channelId]) {
        const tempVC = newState.guild.channels.cache.get(oldState.channelId);
        if (tempVC && tempVC.members.size === 0) {
          await tempVC.delete().catch(() => { });
          delete vcData.vcOwners[oldState.channelId];
          for (const uid in vcData.tempVCs)
            if (vcData.tempVCs[uid] === oldState.channelId) delete vcData.tempVCs[uid];
          saveData();
        }
      }
    } catch (err) { console.error("VoiceMaster error:", err); }
  });

  // COMMANDS
  client.on("messageCreate", async message => {
    if (!message.guild || message.author.bot) return;
    if (message.guild.id !== config.ALLOWED_GUILD) return;
    if (!message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const channel = message.member.voice.channel;
    const target = message.mentions.members.first();
    const successEmbed = (d) => ({ embeds: [embedMsg(d)] });

    // LIST COMMAND (embed + buttons)
    if (cmd === "list") {
      if (!message.member.permissions.has("Administrator")) return;

      const embed = new EmbedBuilder()
        .setColor("#000001")
        .setTitle("VC Commands")
        .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setDescription(`Use the buttons below to manage your voice channel.

**Buttons**
<:vc_lock:1477309124537483439> — Lock your VC
<:vc_unlock:1477309329433559203> — Unlock your VC
<:vc_hide:1477311897262096497> — Hide your VC
<:vc_unhide:1477311594638606336> — Reveal your VC
<:vc_kick:1477311772137619478> — Kick a user
<:vc_ban:1477311983324893274> — Ban a user
<:vc_permit:1477312049783771266> — Permit a user
<:vc_increase:1477690326830289080> — Increase VC user limit
<:vc_decrease:1477690349366280263> — Decrease VC user limit
<:vc_rename:1477312271926431987> — Rename your VC
<:vc_transfer:1477312391770538107> — Transfer ownership
<:vc_claim:1477559856394403942> — Claim unowned VC
<:vc_info:1477312480463294628> — View VC info`);

      // Buttons (gray)
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("vc_lock").setEmoji("1477309124537483439").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_unlock").setEmoji("1477309329433559203").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_hide").setEmoji("1477311897262096497").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_unhide").setEmoji("1477311594638606336").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_kick").setEmoji("1477311772137619478").setStyle(ButtonStyle.Secondary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("vc_ban").setEmoji("1477311983324893274").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_permit").setEmoji("1477312049783771266").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_increase").setEmoji("1477690326830289080").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_decrease").setEmoji("1477690349366280263").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_claim").setEmoji("1477559856394403942").setStyle(ButtonStyle.Secondary)
      );

      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("vc_rename").setEmoji("1477312271926431987").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_transfer").setEmoji("1477312391770538107").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_info").setEmoji("1477312480463294628").setStyle(ButtonStyle.Secondary)
      );

      return message.channel.send({ embeds: [embed], components: [row1, row2, row3] });
    }

    if (cmd !== "vc") return;
    if (!channel) return message.channel.send(successEmbed("You must be in a VC."));
    if (vcData.vcOwners[channel.id] !== message.member.id) return message.channel.send(successEmbed("You are not the VC owner."));
    if (!channel.manageable) return message.channel.send(successEmbed("I can't manage this VC."));

    // VC chat commands
    switch (args[0]?.toLowerCase()) {
      case "lock": await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: false }); return message.channel.send(successEmbed("VC locked."));
      case "unlock": await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: true }); return message.channel.send(successEmbed("VC unlocked."));
      case "hide": await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: false }); return message.channel.send(successEmbed("VC hidden."));
      case "unhide": await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: true }); return message.channel.send(successEmbed("VC unhidden."));
      case "kick": if (!target) return message.channel.send(successEmbed("Mention a user.")); await target.voice.disconnect(); return message.channel.send(successEmbed(`${target.user.tag} kicked.`));
      case "ban": if (!target) return message.channel.send(successEmbed("Mention a user.")); await channel.permissionOverwrites.edit(target, { Connect: false }); await target.voice.disconnect(); return message.channel.send(successEmbed(`${target.user.tag} banned.`));
      case "permit": if (!target) return message.channel.send(successEmbed("Mention a user.")); await channel.permissionOverwrites.edit(target, { Connect: true }); return message.channel.send(successEmbed(`${target.user.tag} permitted.`));
      case "increase": await channel.setUserLimit((channel.userLimit || 0) + 1); return message.channel.send(successEmbed(`VC user limit increased to ${channel.userLimit}.`));
      case "decrease": await channel.setUserLimit(Math.max((channel.userLimit || 1) - 1, 0)); return message.channel.send(successEmbed(`VC user limit decreased to ${channel.userLimit}.`));
      case "rename": const newName = args.slice(1).join(" "); if (!newName) return message.channel.send(successEmbed("Provide a new name.")); await channel.setName(newName); return message.channel.send(successEmbed(`Renamed to ${newName}`));
      case "transfer": if (!target) return message.channel.send(successEmbed("Mention a user.")); vcData.vcOwners[channel.id] = target.id; saveData(); return message.channel.send(successEmbed(`${target.user.tag} is now the VC owner.`));
      case "claim": vcData.vcOwners[channel.id] = message.member.id; saveData(); return message.channel.send(successEmbed("You claimed this VC."));
      case "info": return message.channel.send(successEmbed(`Name: ${channel.name}\nMembers: ${channel.members.size}\nLimit: ${channel.userLimit || "None"}`));
      case "limit": const num = parseInt(args[1]); if (!num || num < 0 || num > 99) return message.channel.send(successEmbed("Provide a number between 0-99.")); await channel.setUserLimit(num); return message.channel.send(successEmbed(`VC user limit set to ${num}.`));
      default: return message.channel.send(successEmbed("Unknown subcommand."));
    }
  });

  // BUTTON INTERACTIONS
  client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;

    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({ content: "You must be in a VC.", ephemeral: true });

    const vcOwner = vcData.vcOwners[channel.id];
    if (vcOwner !== interaction.member.id) return interaction.reply({ content: "You are not the VC owner.", ephemeral: true });

    try {
      switch (interaction.customId) {
        case "vc_lock":
          await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: false });
          return interaction.reply({ content: "VC locked.", ephemeral: true });
        case "vc_unlock":
          await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: true });
          return interaction.reply({ content: "VC unlocked.", ephemeral: true });
        case "vc_hide":
          await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: false });
          return interaction.reply({ content: "VC hidden.", ephemeral: true });
        case "vc_unhide":
          await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: true });
          return interaction.reply({ content: "VC unhidden.", ephemeral: true });
        case "vc_kick":
          return interaction.reply({ content: "Use `.vc kick @user` command.", ephemeral: true });
        case "vc_ban":
          return interaction.reply({ content: "Use `.vc ban @user` command.", ephemeral: true });
        case "vc_permit":
          return interaction.reply({ content: "Use `.vc permit @user` command.", ephemeral: true });
        case "vc_increase":
          await channel.setUserLimit((channel.userLimit || 0) + 1);
          return interaction.reply({ content: `VC user limit increased to ${channel.userLimit}.`, ephemeral: true });
        case "vc_decrease":
          await channel.setUserLimit(Math.max((channel.userLimit || 1) - 1, 0));
          return interaction.reply({ content: `VC user limit decreased to ${channel.userLimit}.`, ephemeral: true });
        case "vc_rename":
          return interaction.reply({ content: "Use `.vc rename <name>` command.", ephemeral: true });
        case "vc_transfer":
          return interaction.reply({ content: "Use `.vc transfer @user` command.", ephemeral: true });
        case "vc_claim":
          vcData.vcOwners[channel.id] = interaction.member.id;
          saveData();
          return interaction.reply({ content: "You claimed this VC.", ephemeral: true });
        case "vc_info":
          return interaction.reply({ content: `Name: ${channel.name}\nMembers: ${channel.members.size}\nLimit: ${channel.userLimit || "None"}`, ephemeral: true });
        default:
          return interaction.reply({ content: "Unknown button.", ephemeral: true });
      }
    } catch (err) {
      console.error("VC button error:", err);
      return interaction.reply({ content: "Something went wrong.", ephemeral: true });
    }
  });
};

module.exports = voiceMaster;
