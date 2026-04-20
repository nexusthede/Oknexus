const { EmbedBuilder } = require("discord.js");
const mongoose = require("mongoose");

// =========================
// MONGODB SCHEMAS
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
// CACHE (ULTRA LIGHT)
// =========================
const cache = new Map();

// =========================
// FAST MEMBER FETCH
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
// FORMAT VC TIME
// =========================
function formatTime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

// =========================
// CHAT LEADERBOARD
// =========================
async function buildChatLB(guild) {
  cache.clear();

  const top = await UserStats.find({ guildId: guild.id })
    .sort({ weeklyMessages: -1 })
    .limit(10)
    .lean();

  const lines = [];

  for (let i = 0; i < top.length; i++) {
    const u = top[i];
    const member = await getMemberFast(guild, u.userId);

    lines.push(
      `**${i + 1}.** ${member ? member.user : "Unknown"} — ${u.weeklyMessages}`
    );
  }

  return new EmbedBuilder()
    .setTitle("Weekly Chat Leaderboard")
    .setColor("#141319")
    .setDescription(lines.join("\n") || "No data yet")
    .setFooter({ text: "Updates every 10 minutes • Resets weekly" });
}

// =========================
// VC LEADERBOARD
// =========================
async function buildVCLB(guild) {
  cache.clear();

  const top = await UserStats.find({ guildId: guild.id })
    .sort({ weeklyVoiceTime: -1 })
    .limit(10)
    .lean();

  const lines = [];

  for (let i = 0; i < top.length; i++) {
    const u = top[i];
    const member = await getMemberFast(guild, u.userId);

    lines.push(
      `**${i + 1}.** ${member ? member.user : "Unknown"} — ${formatTime(u.weeklyVoiceTime)}`
    );
  }

  return new EmbedBuilder()
    .setTitle("Weekly VC Leaderboard")
    .setColor("#141319")
    .setDescription(lines.join("\n") || "No data yet")
    .setFooter({ text: "Updates every 10 minutes • Resets weekly" });
}

// =========================
// RESET SYSTEM (GUILD SAFE + EXACT)
// =========================
async function handleWeeklyReset(client) {
  const now = Date.now();
  const guilds = client.guilds.cache.values();

  for (const guild of guilds) {

    let config = await GuildConfig.findOne({ guildId: guild.id });
    if (!config) continue;

    // initialize reset time if missing
    if (!config.resetAt) {
      config.resetAt = now + 7 * 24 * 60 * 60 * 1000;

      await GuildConfig.updateOne(
        { guildId: guild.id },
        { resetAt: config.resetAt }
      );
    }

    // RESET ONLY WHEN DUE
    if (now >= config.resetAt) {

      await UserStats.updateMany(
        { guildId: guild.id },
        {
          weeklyMessages: 0,
          weeklyVoiceTime: 0,
          vcSessionStart: null,
          vcChannelId: null
        }
      );

      await GuildConfig.updateOne(
        { guildId: guild.id },
        {
          resetAt: now + 7 * 24 * 60 * 60 * 1000
        }
      );
    }
  }
}

// =========================
// MAIN MODULE
// =========================
module.exports = (client) => {

  // =========================
  // CHAT TRACKING
  // =========================
  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    await UserStats.findOneAndUpdate(
      { userId: message.author.id, guildId: message.guild.id },
      { $inc: { weeklyMessages: 1 } },
      { upsert: true }
    );
  });

  // =========================
  // VC TRACKING (ANTI DOUBLE COUNT FIXED)
  // =========================
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

    // MOVE VC
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

  // =========================
  // AUTO UPDATE (EDIT ONLY)
  // =========================
  setInterval(async () => {

    const guilds = client.guilds.cache.values();

    for (const guild of guilds) {

      const config = await GuildConfig.findOne({ guildId: guild.id });
      if (!config?.chatLbChannel || !config?.vcLbChannel) continue;

      try {
        const chatCh = guild.channels.cache.get(config.chatLbChannel);
        const vcCh = guild.channels.cache.get(config.vcLbChannel);

        if (!chatCh || !vcCh) continue;

        let chatMsg = config.chatLbMessage
          ? await chatCh.messages.fetch(config.chatLbMessage).catch(() => null)
          : null;

        let vcMsg = config.vcLbMessage
          ? await vcCh.messages.fetch(config.vcLbMessage).catch(() => null)
          : null;

        const chatEmbed = await buildChatLB(guild);
        const vcEmbed = await buildVCLB(guild);

        if (!chatMsg) {
          chatMsg = await chatCh.send({ embeds: [chatEmbed] });

          await GuildConfig.updateOne(
            { guildId: guild.id },
            { chatLbMessage: chatMsg.id }
          );
        } else {
          chatMsg.edit({ embeds: [chatEmbed] });
        }

        if (!vcMsg) {
          vcMsg = await vcCh.send({ embeds: [vcEmbed] });

          await GuildConfig.updateOne(
            { guildId: guild.id },
            { vcLbMessage: vcMsg.id }
          );
        } else {
          vcMsg.edit({ embeds: [vcEmbed] });
        }

      } catch {}
    }

  }, 10 * 60 * 1000);

  // =========================
  // RESET LOOP (EXACT SYSTEM)
  // =========================
  setInterval(() => {
    handleWeeklyReset(client).catch(() => {});
  }, 60 * 60 * 1000);

  // =========================
  // COMMANDS
  // =========================
  client.on("messageCreate", async (message) => {
    if (!message.guild || !message.content.startsWith(",")) return;

    const args = message.content.slice(1).split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === "setchatlb") {
      const ch = message.mentions.channels.first();
      if (!ch) return;
      await GuildConfig.updateOne(
        { guildId: message.guild.id },
        { chatLbChannel: ch.id },
        { upsert: true }
      );
      return message.reply("Chat leaderboard channel set.");
    }

    if (cmd === "setvclb") {
      const ch = message.mentions.channels.first();
      if (!ch) return;
      await GuildConfig.updateOne(
        { guildId: message.guild.id },
        { vcLbChannel: ch.id },
        { upsert: true }
      );
      return message.reply("VC leaderboard channel set.");
    }

    if (cmd === "postlb") {
      const config = await GuildConfig.findOne({ guildId: message.guild.id });
      if (!config) return;

      const chatCh = message.guild.channels.cache.get(config.chatLbChannel);
      const vcCh = message.guild.channels.cache.get(config.vcLbChannel);

      if (!chatCh || !vcCh) return message.reply("Leaderboard channels missing.");

      const chatMsg = await chatCh.send({ embeds: [await buildChatLB(message.guild)] });
      const vcMsg = await vcCh.send({ embeds: [await buildVCLB(message.guild)] });

      await GuildConfig.updateOne(
        { guildId: message.guild.id },
        {
          chatLbMessage: chatMsg.id,
          vcLbMessage: vcMsg.id
        }
      );

      return message.reply("Leaderboards activated.");
    }
  });
};
