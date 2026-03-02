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

  client.on("voiceStateUpdate", async (oldState, newState) => {
    try {
      const userId = newState.id;

      // JOIN TO CREATE
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
        await newState.member.voice.setChannel(vc).catch(() => {});
        saveData();
      }

      // DELETE EMPTY VC
      const oldVCId = oldState.channelId;
      if (oldVCId && (vcData.vcOwners[oldVCId] || Object.values(vcData.tempVCs).includes(oldVCId))) {
        const tempVC = oldState.guild.channels.cache.get(oldVCId);
        if (tempVC && tempVC.members.size === 0) {
          await tempVC.delete().catch(() => {});
          delete vcData.vcOwners[oldVCId];
          for (const uid in vcData.tempVCs) if (vcData.tempVCs[uid] === oldVCId) delete vcData.tempVCs[uid];
          saveData();
        }
      }
    } catch (err) { console.error("VoiceMaster error:", err); }
  });

  client.on("messageCreate", async message => {
    if (!message.guild || message.author.bot) return;
    if (message.guild.id !== config.ALLOWED_GUILD) return;
    if (!message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const channel = message.member.voice.channel;
    const target = message.mentions.members.first();
    const successEmbed = (d) => ({ embeds: [embedMsg(d)] });

    // LIST COMMAND
    if (cmd === "list") {
      if (!message.member.permissions.has("Administrator")) return;
      const embed = new EmbedBuilder()
        .setColor("#000001")
        .setTitle("VC Commands")
        .setThumbnail(message.guild.iconURL({ dynamic: true }))
        .setDescription(`
Use the buttons below to manage your voice channel.

**Buttons**
<:vc_lock:1477309124537483439> — **Lock** your VC
<:vc_unlock:1477309329433559203> — **Unlock** your VC
<:vc_hide:1477311897262096497> — **Hide** your VC
<:vc_unhide:1477311594638606336> — **Reveal** your VC
<:vc_kick:1477311772137619478> — **Kick** a user
<:vc_ban:147731198332489274> — **Ban** a user
<:vc_permit:1477312049783771266> — **Permit** a user
<:vc_increase:1477690326830289080> — **Increase** VC user limit
<:vc_decrease:1477690349366280263> — **Decrease** VC user limit
<:vc_rename:1477312271926431987> — **Rename** your VC
<:vc_transfer:1477312391770538107> — **Transfer** ownership
<:vc_claim:1477559856394403942> — **Claim** unowned VC
<:vc_info:1477312480463294628> — **View** VC info
        `);
      return message.channel.send({ embeds: [embed] });
    }

    if (cmd !== "vc") return;
    if (!channel) return message.channel.send(successEmbed("You must be in a VC."));
    if (vcData.vcOwners[channel.id] !== message.member.id) return message.channel.send(successEmbed("You are not the VC owner."));
    if (!channel.manageable) return message.channel.send(successEmbed("I can't manage this VC."));

    switch (args[0]?.toLowerCase()) {
      case "lock":
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: false });
        return message.channel.send(successEmbed("VC locked."));
      case "unlock":
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: true });
        return message.channel.send(successEmbed("VC unlocked."));
      case "hide":
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: false });
        return message.channel.send(successEmbed("VC hidden."));
      case "unhide":
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: true });
        return message.channel.send(successEmbed("VC unhidden."));
      case "kick":
        if (!target) return message.channel.send(successEmbed("Mention a user."));
        await target.voice.disconnect();
        return message.channel.send(successEmbed(`${target.user.tag} kicked.`));
      case "ban":
        if (!target) return message.channel.send(successEmbed("Mention a user."));
        await channel.permissionOverwrites.edit(target, { Connect: false });
        await target.voice.disconnect();
        return message.channel.send(successEmbed(`${target.user.tag} banned.`));
      case "permit":
        if (!target) return message.channel.send(successEmbed("Mention a user."));
        await channel.permissionOverwrites.edit(target, { Connect: true });
        return message.channel.send(successEmbed(`${target.user.tag} permitted.`));
      case "increase": {
        const newLimit = (channel.userLimit || 10) + 1;
        await channel.setUserLimit(newLimit);
        return message.channel.send(successEmbed(`VC user limit increased to ${newLimit}.`));
      }
      case "decrease": {
        const newLimit = Math.max((channel.userLimit || 10) - 1, 0);
        await channel.setUserLimit(newLimit);
        return message.channel.send(successEmbed(`VC user limit decreased to ${newLimit}.`));
      }
      case "rename":
        const newName = args.slice(1).join(" ");
        if (!newName) return message.channel.send(successEmbed("Provide a new name."));
        await channel.setName(newName);
        return message.channel.send(successEmbed(`Renamed to ${newName}`));
      case "transfer":
        if (!target) return message.channel.send(successEmbed("Mention a user."));
        vcData.vcOwners[channel.id] = target.id;
        saveData();
        return message.channel.send(successEmbed(`${target.user.tag} is now the VC owner.`));
      case "claim":
        vcData.vcOwners[channel.id] = message.member.id;
        vcData.tempVCs[message.member.id] = channel.id;
        saveData();
        return message.channel.send(successEmbed("You claimed this VC."));
      case "info":
        return message.channel.send(successEmbed(`Name: ${channel.name}\nMembers: ${channel.members.size}\nLimit: ${channel.userLimit || "None"}`));
      default:
        return message.channel.send(successEmbed("Unknown subcommand."));
    }
  });
};

module.exports = voiceMaster;
