const { ChannelType, EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config");

const voiceMaster = (client) => {
  const dataPath = path.join(__dirname, "vcData.json");
  let vcData = { vcOwners: {}, tempVCs: {} };
  if (fs.existsSync(dataPath)) vcData = JSON.parse(fs.readFileSync(dataPath));

  const saveData = () => fs.writeFileSync(dataPath, JSON.stringify(vcData, null, 2));

  client.on("voiceStateUpdate", async (oldState, newState) => {
    try {
      const userId = newState.id;

      // Join-to-create
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
          userLimit: 10,
        });

        vcData.tempVCs[userId] = vc.id;
        vcData.vcOwners[vc.id] = userId;

        await newState.member.voice.setChannel(vc).catch(() => {});
        saveData();
      }

      // Auto-delete empty VC
      if (oldState.channelId && vcData.vcOwners[oldState.channelId]) {
        const tempVCId = oldState.channelId;
        const tempVC = newState.guild.channels.cache.get(tempVCId);
        if (tempVC && tempVC.members.size === 0) {
          await tempVC.delete().catch(() => {});
          delete vcData.vcOwners[tempVCId];
          for (const uid in vcData.tempVCs) {
            if (vcData.tempVCs[uid] === tempVCId) delete vcData.tempVCs[uid];
          }
          saveData();
        }
      }
    } catch (err) {
      console.error("VoiceMaster error:", err);
    }
  });
};

module.exports = voiceMaster;
