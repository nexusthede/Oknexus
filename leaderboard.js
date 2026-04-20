const { EmbedBuilder } = require("discord.js");
const mongoose = require("mongoose");

// =========================
// SCHEMAS
// =========================
const userSchema = new mongoose.Schema({
  userId: String,
  guildId: String,

  weeklyMessages: { type: Number, default: 0 },
  weeklyVoiceTime: { type: Number, default: 0 },

  vcSessionStart: Number,
  vcChannelId: String
});

const guildSchema = new mongoose.Schema({
  guildId: String,
  chatLbChannel: String,
  vcLbChannel: String,
  chatLbMessage: String,
  vcLbMessage: String,
  resetAt: Number
});

const UserStats = mongoose.model("UserStats", userSchema);
const GuildConfig = mongoose.model("GuildConfig", guildSchema);

// =========================
// CACHE (FIXED LEAK SAFETY)
// =========================
const cache = new Map();

// prevent memory leak
setInterval(() => cache.clear(), 10 * 60 * 1000);

// =========================
// MEMBER FETCH
// =========================
async function getMemberFast(guild, id) {
  if (cache.has(id)) return cache.get(id);

  const member =
    guild.members.cache.get(id) ||
    (await guild.members.fetch(id).catch(() => null));

  cache.set(id, member || null);
  return member;
}

// =========================
// FORMAT TIME
// =========================
function formatTime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

// =========================
// CHAT LB
// =========================
async function buildChatLB(guild) {
  const top = await UserStats.find({ guildId: guild.id })
    .sort({ weeklyMessages: -1 })
    .limit(10)
    .lean();

  const lines = [];

  for (let i = 0; i < top.length; i++) {
    const u = top[i];
    const member = await getMemberFast(guild, u.userId);

    lines.push(
      `**${i + 1}.** ${member ? member.user : "Unknown"} — ${u.weeklyMessages || 0}`
    );
  }

  return new EmbedBuilder()
    .setTitle("Weekly Chat Leaderboard")
    .setColor("#141319")
    .setDescription(lines.join("\n") || "No data yet")
    .setFooter({ text: "Resets weekly" });
}

// =========================
// VC LB
// =========================
async function buildVCLB(guild) {
  const top = await UserStats.find({ guildId: guild.id })
    .sort({ weeklyVoiceTime: -1 })
    .limit(10)
    .lean();

  const lines = [];

  for (let i = 0; i < top.length; i++) {
    const u = top[i];
    const member = await getMemberFast(guild, u.userId);

    lines.push(
      `**${i + 1}.** ${member ? member.user : "Unknown"} — ${formatTime(u.weeklyVoiceTime || 0)}`
    );
  }

  return new EmbedBuilder()
    .setTitle("Weekly VC Leaderboard")
    .setColor("#141319")
    .setDescription(lines.join("\n") || "No data yet")
    .setFooter({ text: "Resets weekly" });
}

// =========================
// RESET SYSTEM (SAFE)
// =========================
async function handleWeeklyReset(client) {
  const now = Date.now();

  for (const guild of client.guilds.cache.values()) {

    const config = await GuildConfig.findOne({ guildId: guild.id });
    if (!config) continue;

    if (!config.resetAt) {
      config.resetAt = now + 7 * 24 * 60 * 60 * 1000;
      await config.save();
    }

    if (now < config.resetAt) continue;

    await UserStats.updateMany(
      { guildId: guild.id },
      {
        weeklyMessages: 0,
        weeklyVoiceTime: 0,
        vcSessionStart: null,
        vcChannelId: null
      }
    );

    config.resetAt = now + 7 * 24 * 60 * 60 * 1000;
    await config.save();
  }
}

// =========================
// MODULE
// =========================
module.exports = (client) => {

  // CHAT TRACK
  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    await UserStats.findOneAndUpdate(
      { userId: message.author.id, guildId: message.guild.id },
      { $inc: { weeklyMessages: 1 } },
      { upsert: true }
    );
  });

  // VC TRACK (FIXED DOUBLE COUNT + SAFETY)
  client.on("voiceStateUpdate", async (oldState, newState) => {

    const userId = newState.id;
    const guildId = newState.guild.id;

    const data = await UserStats.findOne({ userId, guildId });

    // JOIN
    if (!oldState.channelId && newState.channelId) {
      await UserStats.findOneAndUpdate(
        { userId, guildId },
        {
          vcSessionStart: Date.now(),
          vcChannelId: newState.channelId
        },
        { upsert: true }
      );
    }

    // LEAVE
    if (oldState.channelId && !newState.channelId) {

      if (data?.vcSessionStart) {
        const time = Date.now() - data.vcSessionStart;

        await UserStats.findOneAndUpdate(
          { userId, guildId },
          {
            $inc: { weeklyVoiceTime: time },
            $unset: { vcSessionStart: 1, vcChannelId: 1 }
          }
        );
      }
    }

    // MOVE (SAFE FIX)
    if (
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId
    ) {

      if (data?.vcSessionStart) {
        const time = Date.now() - data.vcSessionStart;

        await UserStats.findOneAndUpdate(
          { userId, guildId },
          {
            $inc: { weeklyVoiceTime: time },
            vcSessionStart: Date.now(),
            vcChannelId: newState.channelId
          }
        );
      }
    }
  });

  // AUTO UPDATE (SAFE LOCK)
  let updating = false;

  setInterval(async () => {
    if (updating) return;
    updating = true;

    try {
      for (const guild of client.guilds.cache.values()) {

        const config = await GuildConfig.findOne({ guildId: guild.id });
        if (!config?.chatLbChannel || !config?.vcLbChannel) continue;

        const chatCh = guild.channels.cache.get(config.chatLbChannel);
        const vcCh = guild.channels.cache.get(config.vcLbChannel);

        if (!chatCh || !vcCh) continue;

        const chatEmbed = await buildChatLB(guild);
        const vcEmbed = await buildVCLB(guild);

        let chatMsg = config.chatLbMessage
          ? await chatCh.messages.fetch(config.chatLbMessage).catch(() => null)
          : null;

        let vcMsg = config.vcLbMessage
          ? await vcCh.messages.fetch(config.vcLbMessage).catch(() => null)
          : null;

        if (chatMsg) chatMsg.edit({ embeds: [chatEmbed] });
        else {
          chatMsg = await chatCh.send({ embeds: [chatEmbed] });
          config.chatLbMessage = chatMsg.id;
        }

        if (vcMsg) vcMsg.edit({ embeds: [vcEmbed] });
        else {
          vcMsg = await vcCh.send({ embeds: [vcEmbed] });
          config.vcLbMessage = vcMsg.id;
        }

        await config.save();
      }

    } catch (e) {
      console.error(e);
    }

    updating = false;

  }, 10 * 60 * 1000);

  // RESET LOOP
  setInterval(() => {
    handleWeeklyReset(client).catch(() => {});
  }, 60 * 60 * 1000);
};
