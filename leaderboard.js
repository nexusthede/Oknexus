const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const config = require("./config");

let chatLB = new Map();
let vcLB = new Map();

let chatMsgId = null;
let vcMsgId = null;

// Get next weekly reset (Sunday 00:00 UTC)
function getNextReset() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(0, 0, 0, 0);
  next.setUTCDate(now.getUTCDate() + ((7 - now.getUTCDay()) % 7 || 7));
  return next;
}

// Decimal days until reset
function getDaysUntilReset() {
  const now = Date.now();
  const diff = getNextReset() - now;
  return (diff / (1000 * 60 * 60 * 24)).toFixed(1);
}

// Create leaderboard embed
function createEmbed(title, map, type, allMembers) {
  allMembers.forEach(member => {
    if (!member.user.bot && !map.has(member.id)) map.set(member.id, 0);
  });

  const sorted = [...map.entries()]
    .filter(([id]) => allMembers.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const label = type === "vc" ? "h" : "msgs";

  const desc = sorted
    .map((u, i) => {
      const member = allMembers.get(u[0]);
      const username = member ? `<@${u[0]}>` : "Unknown";
      return `**${i + 1}.** ${username} — \`${u[1]} ${label}\``;
    })
    .join("\n");

  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle(title)
    .setDescription(desc || "No activity yet")
    .setFooter({ text: `Resets in ${getDaysUntilReset()} days • Updated every 10 mins` })
    .setTimestamp();
}

// Send or edit message safely
async function updateMessage(channel, msgId, embed) {
  try {
    if (msgId) {
      const msg = await channel.messages.fetch(msgId);
      await msg.edit({ embeds: [embed] });
      return msg.id;
    } else {
      const msg = await channel.send({ embeds: [embed] });
      return msg.id;
    }
  } catch {
    const msg = await channel.send({ embeds: [embed] });
    return msg.id;
  }
}

// Track chat messages
function trackMessage(message) {
  if (!message.guild || message.guild.id !== config.ALLOWED_GUILD) return;
  if (message.author.bot) return;
  chatLB.set(message.author.id, (chatLB.get(message.author.id) || 0) + 1);
}

// Track VC minutes
function trackVoice(memberId, minutes = 1) {
  vcLB.set(memberId, (vcLB.get(memberId) || 0) + minutes);
}

// Auto update leaderboard every 10 minutes
function autoUpdate(client) {
  setInterval(async () => {
    await module.exports.updateChat(client);
    await module.exports.updateVC(client);
  }, 10 * 60 * 1000);
}

// Schedule weekly reset
function scheduleWeeklyReset() {
  const now = Date.now();
  const diff = getNextReset() - now;
  setTimeout(() => {
    chatLB.clear();
    vcLB.clear();
    scheduleWeeklyReset();
  }, diff);
}

// Admin commands
async function handleCommand(message) {
  if (!message.guild) return;
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  // Delete command after 5 seconds
  message.delete().catch(() => {});

  if (cmd === "set") {
    const sub = args.shift()?.toLowerCase();
    const channel = message.mentions.channels.first();
    if (!channel) return;

    let embed;
    if (sub === "vclb") {
      config.VC_LB_CHANNEL = channel.id;
      embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setDescription(`VC Leaderboard channel set to <#${channel.id}>`);
    } else if (sub === "chatlb") {
      config.CHAT_LB_CHANNEL = channel.id;
      embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setDescription(`Chat Leaderboard channel set to <#${channel.id}>`);
    } else {
      embed = new EmbedBuilder()
        .setColor("#ED4245")
        .setDescription("Invalid option. Use `vclb` or `chatlb`.");
    }

    const msg = await message.channel.send({ embeds: [embed] });
    setTimeout(() => msg.delete().catch(() => {}), 5000);
  }

  if (cmd === "upload") {
    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setDescription("Uploading leaderboard embeds...");
    const msg = await message.channel.send({ embeds: [embed] });
    setTimeout(() => msg.delete().catch(() => {}), 5000);

    if (config.CHAT_LB_CHANNEL) {
      const ch = message.guild.channels.cache.get(config.CHAT_LB_CHANNEL);
      if (ch) await module.exports.setupChat({ channel: ch, guild: message.guild });
    }
    if (config.VC_LB_CHANNEL) {
      const ch = message.guild.channels.cache.get(config.VC_LB_CHANNEL);
      if (ch) await module.exports.setupVC({ channel: ch, guild: message.guild });
    }
  }
}

module.exports = {
  addChat: trackMessage,
  addVC: trackVoice,
  handleCommand,

  async updateChat(client) {
    if (!config.CHAT_LB_CHANNEL) return;
    const guild = client.guilds.cache.get(config.ALLOWED_GUILD);
    if (!guild) return;
    const ch = guild.channels.cache.get(config.CHAT_LB_CHANNEL);
    if (!ch) return;

    const embed = createEmbed("Weekly Chat Leaderboard", chatLB, "chat", guild.members.cache);
    chatMsgId = await updateMessage(ch, chatMsgId, embed);
  },

  async updateVC(client) {
    if (!config.VC_LB_CHANNEL) return;
    const guild = client.guilds.cache.get(config.ALLOWED_GUILD);
    if (!guild) return;
    const ch = guild.channels.cache.get(config.VC_LB_CHANNEL);
    if (!ch) return;

    const embed = createEmbed("Weekly VC Leaderboard", vcLB, "vc", guild.members.cache);
    vcMsgId = await updateMessage(ch, vcMsgId, embed);
  },

  async setupChat({ channel, guild }) {
    const embed = createEmbed("Weekly Chat Leaderboard", chatLB, "chat", guild.members.cache);
    const msg = await channel.send({ embeds: [embed] });
    chatMsgId = msg.id;
  },

  async setupVC({ channel, guild }) {
    const embed = createEmbed("Weekly VC Leaderboard", vcLB, "vc", guild.members.cache);
    const msg = await channel.send({ embeds: [embed] });
    vcMsgId = msg.id;
  },

  start(client) {
    autoUpdate(client);
    scheduleWeeklyReset();
  },

  resetWeekly() {
    chatLB.clear();
    vcLB.clear();
  },
};
