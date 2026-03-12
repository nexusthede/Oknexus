const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require("discord.js");
const config = require("./config");

// Track ownership for VoiceMaster & Private voice channels
const vcOwners = new Map();

module.exports = {
  async execute(client, message) {
    if (!message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const member = message.member;
    const channel = member.voice.channel;

    // --------------------------
    // ,interface command
    // --------------------------
    if (command === "interface") {
      const guild = message.guild;

      const embed = new EmbedBuilder()
        .setTitle("VoiceMaster Interface")
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
        .setDescription(`
Use the buttons below to manage your voice channel.

<:vc_lock:1477309124537483439> - Lock your voice channel  
<:vc_unlock:1477309329433559203> - Unlock your voice channel  
<:vc_hide:1477311897262096497> - Hide your voice channel  
<:vc_unhide:1477311594638606336> - Reveal your voice channel  
<:vc_rename:1477312271926431987> - Rename your voice channel  
<:vc_decrease:1477690349366280263> - Decrease the member limit  
<:vc_increase:1477690326830287080> - Increase the member limit  
<:vc_info:1477312480463294628> - Info about your voice channel  
<:vc_kick:1477311772137619478> - Kick someone from your voice channel  
<:vc_claim:1477559856394403942> - Claim ownership of your voice channel
        `)
        .setColor(null);

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("lock").setEmoji("1477309124537483439").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("unlock").setEmoji("1477309329433559203").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("claim").setEmoji("1477559856394403942").setStyle(ButtonStyle.Secondary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("rename").setEmoji("1477312271926431987").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("decrease").setEmoji("1477690349366280263").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("increase").setEmoji("1477690326830287080").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("info").setEmoji("1477312480463294628").setStyle(ButtonStyle.Secondary)
      );

      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("hide").setEmoji("1477311897262096497").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("unhide").setEmoji("1477311594638606336").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("kick").setEmoji("1477311772137619478").setStyle(ButtonStyle.Danger)
      );

      return message.channel.send({ embeds: [embed], components: [row1, row2, row3] });
    }

    // --------------------------
    // ,voicechannel <action> commands
    // --------------------------
    if (command === "voicechannel") {
      const action = args.shift()?.toLowerCase();
      if (!channel) return message.reply("<:xx_no:1481734627193520323> You are not in a voice channel!");

      const ownerId = vcOwners.get(channel.id);
      if (ownerId && ownerId !== member.id)
        return message.reply("<:xx_no:1481734627193520323> You do not own this voice channel!");

      try {
        await performVoiceChannelAction(action, member, channel, args);
      } catch (err) {
        console.error(err);
        return message.reply("<:xx_no:1481734627193520323> Failed to perform this action!");
      }
    }
  },

  setupVoiceListeners(client) {
    client.on("voiceStateUpdate", async (oldState, newState) => {
      const member = newState.member;

      // ------------- JOIN TO CREATE -------------
      if (newState.channelId === config.JOIN_TO_CREATE_ID) {
        try {
          const guild = newState.guild;
          const vc = await guild.channels.create({
            name: `${member.user.username}'s VoiceMaster`,
            type: 2, // GUILD_VOICE
            parent: config.VOICEMASTER_CATEGORY,
            permissionOverwrites: [
              { id: guild.roles.everyone.id, allow: ["Connect", "Speak"] },
            ],
          });

          vcOwners.set(vc.id, member.id);
          await member.voice.setChannel(vc);

          // Auto-delete empty channel
          const interval = setInterval(async () => {
            if (vc.deleted) return clearInterval(interval);
            if (vc.members.size === 0) {
              clearInterval(interval);

              // Move to public VC if any members left (rare)
              const publicCategory = guild.channels.cache.get(config.PUBLIC_VC_CATEGORY);
              vc.members.forEach((m) => {
                if (publicCategory && publicCategory.children.first())
                  m.voice.setChannel(publicCategory.children.first()).catch(() => {});
              });

              await vc.delete().catch(() => {});
              vcOwners.delete(vc.id);
            }
          }, 10000);
        } catch (err) {
          console.error("Join-to-Create Error:", err);
        }
      }

      // ------------- JOIN TO UNMUTE -------------
      if (newState.channelId === config.JOIN_TO_UNMUTE_ID) {
        try {
          if (newState.serverMute) await newState.setMute(false, "Join-to-Unmute VoiceMaster");
        } catch (err) {
          console.error("Join-to-Unmute Error:", err);
        }
      }
    });

    // --------------------------
    // Button interactions
    // --------------------------
    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isButton()) return;

      const member = interaction.member;
      const channel = member.voice.channel;
      const action = interaction.customId;

      if (!channel) {
        return interaction.reply({ content: "<:xx_no:1481734627193520323> You are not in a voice channel!", ephemeral: true });
      }

      const ownerId = vcOwners.get(channel.id);
      if (ownerId && ownerId !== member.id) {
        return interaction.reply({ content: "<:xx_no:1481734627193520323> You do not own this voice channel!", ephemeral: true });
      }

      try {
        await performVoiceChannelAction(action, member, channel);
        return interaction.reply({ content: "<:xx_yes:1481734672416378902> Action performed!", ephemeral: true });
      } catch (err) {
        console.error(err);
        return interaction.reply({ content: "<:xx_no:1481734627193520323> Failed to perform this action!", ephemeral: true });
      }
    });
  }
};

// --------------------------
// Helper: perform actions
// --------------------------
async function performVoiceChannelAction(action, member, channel, extraArgs = []) {
  switch (action) {
    case "lock":
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: false });
      return member.send("<:xx_yes:1481734672416378902> Your voice channel is now **locked**!").catch(() => {});
    case "unlock":
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: true });
      return member.send("<:xx_yes:1481734672416378902> Your voice channel is now **unlocked**!").catch(() => {});
    case "hide":
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: false });
      return member.send("<:xx_yes:1481734672416378902> Your voice channel is now **hidden**!").catch(() => {});
    case "unhide":
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: true });
      return member.send("<:xx_yes:1481734672416378902> Your voice channel is now **visible**!").catch(() => {});
    case "rename":
      const name = extraArgs.join(" ");
      if (!name) return member.send("<:xx_no:1481734627193520323> You must provide a new name!").catch(() => {});
      await channel.setName(name);
      return member.send(`<:xx_yes:1481734672416378902> Your voice channel has been renamed to **${name}**!`).catch(() => {});
    case "increase":
      await channel.setUserLimit(channel.userLimit + 1);
      return member.send("<:xx_yes:1481734672416378902> Member limit increased!").catch(() => {});
    case "decrease":
      await channel.setUserLimit(channel.userLimit - 1);
      return member.send("<:xx_yes:1481734672416378902> Member limit decreased!").catch(() => {});
    case "kick":
      const target = channel.members.find((m) => m.id !== member.id);
      if (!target) return member.send("<:xx_no:1481734627193520323> No one to kick!").catch(() => {});
      await target.voice.disconnect();
      return member.send(`<:xx_yes:1481734672416378902> ${target.user.username} has been kicked!`).catch(() => {});
    case "info":
      return member.send(`<:xx_yes:1481734672416378902> Voice channel info: ${channel.members.size}/${channel.userLimit}`).catch(() => {});
    case "claim":
      vcOwners.set(channel.id, member.id);
      return member.send("<:xx_yes:1481734672416378902> You now **own** this voice channel!").catch(() => {});
    default:
      return member.send("<:xx_no:1481734627193520323> Unknown action!").catch(() => {});
  }
}
