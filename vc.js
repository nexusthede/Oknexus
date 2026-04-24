const {
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const mongoose = require("mongoose");

// =========================
// MONGODB
// =========================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).catch(console.error);

const vcSchema = new mongoose.Schema({
  guildId: String,
  channelId: String,
  ownerId: String
});

const VCModel = mongoose.model("vcOwners", vcSchema);

// =========================
// TEMP CACHE
// =========================
const tempVCs = new Map();

// =========================
// CHANNEL IDS
// =========================
const joinToCreate1 = "1495858476155404499";
const joinToCreate2 = "1495858503632552087";

const joinToUnmute1 = "1488780563459477505";
const joinToUnmute2 = "1493746784835731678";

const publicCategory = "1488684928039256165";
const privateCategory = "1488779858443108353";

// =========================
// OWNER HELPERS
// =========================
async function getOwner(vcId) {
  const data = await VCModel.findOne({ channelId: vcId });
  return data?.ownerId || null;
}

async function setOwner(vcId, guildId, userId) {
  await VCModel.findOneAndUpdate(
    { channelId: vcId },
    { guildId, channelId: vcId, ownerId: userId },
    { upsert: true }
  );
}

async function deleteOwner(vcId) {
  await VCModel.deleteOne({ channelId: vcId });
}

// =========================
// PANEL (UNCHANGED)
// =========================
function buildPanel(message) {
  return new EmbedBuilder()
    .setTitle("VoiceMaster Interface")
    .setAuthor({
      name: message.guild.name,
      iconURL: message.guild.iconURL({ dynamic: true })
    })
    .setColor("#141319")
    .setDescription(`Click the buttons below or use the commands to manage your VC.

**Buttons**
<:vc_lock:1477309124537483439> \`.vc lock\` – Locks your VC.
<:vc_unlock:1477309329433559203> \`.vc unlock\` – Unlocks your VC.
<:vc_hide:1477311897262096497> \`.vc hide\` – Hides your VC.
<:vc_reveal:1477311594638606336> \`.vc reveal\` – Reveals your VC.
<:vc_limit:1486267107376234506> \`.vc limit\` – Sets the VC user limit.
<:vc_kick:1477311772137619478> \`.vc kick\` – Kicks a user from your VC.
<:vc_ban:1489137904469934141> \`.vc ban\` – Bans a user from your VC.
<:vc_permit:1486267187709607937> \`.vc permit\` – Allows a user to join your VC.
<:vc_claim:1489137213378662411> \`.vc claim\` – Claims ownership of your VC.
<:vc_info:1477312480463294628> \`.vc info\` – Shows your VC info.`);
}

// =========================
// BUTTONS (UNCHANGED)
// =========================
function buildButtons() {
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

  return [row1, row2];
}

// =========================
// MAIN EXPORT
// =========================
module.exports = (client) => {

  // =========================
  // MESSAGE COMMANDS
  // =========================
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(".")) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // PANEL
    if (cmd === "send") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

      return message.channel.send({
        embeds: [buildPanel(message)],
        components: buildButtons()
      });
    }

    if (cmd !== "vc") return;

    const sub = args[0];
    const vc = message.member.voice.channel;

    if (!vc)
      return message.reply({
        embeds: [new EmbedBuilder().setDescription("You’re not in a **voice channel**.")]
      });

    const ownerId = await getOwner(vc.id);
    const isOwner = ownerId === message.member.id;

    try {
      switch (sub) {

        case "lock":
          if (!isOwner) return;

          await vc.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: false });
          for (const m of vc.members.values()) {
            await vc.permissionOverwrites.edit(m.id, { Connect: true });
          }

          return message.reply({ embeds: [new EmbedBuilder().setDescription("VC locked.")] });

        case "unlock":
          if (!isOwner) return;

          await vc.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: true });

          return message.reply({ embeds: [new EmbedBuilder().setDescription("VC unlocked.")] });

        case "hide":
          if (!isOwner) return;

          await vc.permissionOverwrites.edit(message.guild.roles.everyone, {
            ViewChannel: false,
            Connect: false
          });

          for (const m of vc.members.values()) {
            await vc.permissionOverwrites.edit(m.id, {
              ViewChannel: true,
              Connect: true
            });
          }

          return message.reply({ embeds: [new EmbedBuilder().setDescription("VC hidden.")] });

        case "reveal":
          if (!isOwner) return;

          await vc.permissionOverwrites.edit(message.guild.roles.everyone, {
            ViewChannel: true,
            Connect: true
          });

          return message.reply({ embeds: [new EmbedBuilder().setDescription("VC revealed.")] });

        case "limit":
          if (!isOwner) return;

          const limit = Number(args[1]);

          if (!args[1] || !Number.isInteger(limit) || limit < 0 || limit > 99) {
            return message.reply({
              embeds: [new EmbedBuilder().setDescription("Provide a valid number (0-99).")]
            });
          }

          await vc.edit({ userLimit: limit });

          return message.reply({
            embeds: [new EmbedBuilder().setDescription(`User limit set to **${limit}**.`)]
          });

        case "kick":
          if (!isOwner) return;

          const kickMember = message.mentions.members.first();
          if (!kickMember?.voice?.channelId || kickMember.voice.channelId !== vc.id)
            return message.reply("Cannot kick this user.");

          await kickMember.voice.disconnect().catch(() => {});

          return message.reply({ embeds: [new EmbedBuilder().setDescription("User kicked.")] });

        case "ban":
          if (!isOwner) return;

          const banMember = message.mentions.members.first();
          if (!banMember) return;

          await vc.permissionOverwrites.edit(banMember.id, { Connect: false });

          return message.reply({ embeds: [new EmbedBuilder().setDescription("User banned.")] });

        case "permit":
          if (!isOwner) return;

          const permitMember = message.mentions.members.first();
          if (!permitMember) return;

          await vc.permissionOverwrites.edit(permitMember.id, {
            ViewChannel: true,
            Connect: true
          });

          return message.reply({ embeds: [new EmbedBuilder().setDescription("User permitted.")] });

        case "claim":
          if (ownerId && vc.members.some(m => m.id === ownerId)) return;

          await setOwner(vc.id, message.guild.id, message.member.id);

          return message.reply({ embeds: [new EmbedBuilder().setDescription("Ownership claimed.")] });

        case "rename":
          if (!isOwner) return;

          const newName = args.slice(1).join(" ");
          if (!newName) return;

          await vc.setName(newName).catch(() => vc.edit({ name: newName }));

          return message.reply({ embeds: [new EmbedBuilder().setDescription("VC renamed.")] });

        case "transfer":
          if (!isOwner) return;

          const target = message.mentions.members.first();
          if (!target?.voice?.channelId || target.voice.channelId !== vc.id) return;

          await setOwner(vc.id, message.guild.id, target.id);

          return message.reply({ embeds: [new EmbedBuilder().setDescription("Ownership transferred.")] });

        case "info": {
          const membersList =
            vc.members.map(m => `• ${m.displayName}`).slice(0, 15).join("\n") || "No members";

          const ownerMember = ownerId
            ? await message.guild.members.fetch(ownerId).catch(() => null)
            : null;

          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(`VC Info - ${vc.name}`)
                .setColor("#141319")
                .addFields(
                  { name: "Owner", value: ownerMember ? ownerMember.user.tag : "No owner", inline: true },
                  { name: "Members", value: `${vc.members.size}`, inline: true },
                  { name: "User Limit", value: vc.userLimit > 0 ? `${vc.userLimit}` : "No limit", inline: true },
                  {
                    name: "Status",
                    value: vc.permissionsFor(message.guild.roles.everyone)
                      .has(PermissionsBitField.Flags.Connect)
                      ? "Unlocked"
                      : "Locked/Hid",
                    inline: true
                  },
                  { name: "Member List", value: membersList }
                )
            ]
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  // =========================
  // VOICE SYSTEM
  // =========================
  client.on("voiceStateUpdate", async (oldState, newState) => {

    const isCreate =
      newState.channelId === joinToCreate1 ||
      newState.channelId === joinToCreate2;

    const isUnmute =
      newState.channelId === joinToUnmute1 ||
      newState.channelId === joinToUnmute2;

    if (isCreate) {
      const vc = await newState.guild.channels.create({
        name: `${newState.member.displayName}'s channel`,
        type: ChannelType.GuildVoice,
        parent: publicCategory
      }).catch(() => null);

      if (!vc) return;

      await setOwner(vc.id, newState.guild.id, newState.member.id);
      return newState.member.voice.setChannel(vc).catch(() => {});
    }

    if (isUnmute) {
      if (tempVCs.get(newState.member.id)) return;
      if (!oldState.channel) return;

      tempVCs.set(newState.member.id, true);

      try {
        const originalVC = oldState.channel;

        await newState.member.voice.setMute(false).catch(() => {});
        await new Promise(r => setTimeout(r, 500));

        if (originalVC) {
          await newState.member.voice.setChannel(originalVC).catch(() => {});
        }
      } catch (err) {
        console.error(err);
      }

      setTimeout(() => tempVCs.delete(newState.member.id), 3000);
    }

    if (oldState.channel) {
      const ch = oldState.channel;

      if (![publicCategory, privateCategory].includes(ch.parentId)) return;

      if (
        ch.id === joinToCreate1 ||
        ch.id === joinToCreate2 ||
        ch.id === joinToUnmute1 ||
        ch.id === joinToUnmute2
      ) return;

      if (ch.members.size === 0) {
        await deleteOwner(ch.id);
        ch.delete().catch(() => {});
      }
    }
  });
};
