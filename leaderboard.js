const { EmbedBuilder } = require("discord.js");
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
  // Include all non-bot members with 0 if missing
  allMembers.forEach(member => {
    if (!member.user.bot && !map.has(member.id)) map.set(member.id, 0);
  });

  const sorted = [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const medals = [
    "<a:gold_crown:1475378812266086410>",
    "<a:silver_crown:1475378823506690098>",
    "<a:bronze_crown:1475378837251428403>",
  ];
  const diamond = "<a:shiny_diamond:1475401622686273546>";
  const label = type === "vc" ? "mins" : "msgs";

  const desc = sorted
    .map((u, i) => {
      const emoji = i < 3 ? medals[i] : diamond;
      const member = allMembers.get(u[0]);
      const username = member ? member.user.username : "Unknown";
      return `\`${i + 1}.\` ${emoji} **${username}** — \`${u[1]} ${label}\``;
    })
    .join("\n");

  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle(title)
    .setDescription(`${desc}\n**Resets in**\n\`${getDaysUntilReset()} Days\``)
    .setFooter({ text: "Updated • Resets weekly" })
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

// Automatic leaderboard update every 10 minutes
function autoUpdate(client) {
  setInterval(async () => {
    await module.exports.executeChat(client);
    await module.exports.executeVC(client);
  }, 10 * 60 * 1000);
}

// Schedule weekly reset
function scheduleWeeklyReset() {
  const now = Date.now();
  const next = getNextReset();
  const diff = next - now;
  setTimeout(() => {
    chatLB.clear();
    vcLB.clear();
    scheduleWeeklyReset();
  }, diff);
}

// Track chat messages
function trackMessage(message) {
  if (!message.guild || message.guild.id !== config.ALLOWED_GUILD) return;
  if (message.author.bot) return;
  module.exports.addChat(message.author.id);
}

// Track VC minutes
function trackVoice(memberId, minutes = 1) {
  vcLB.set(memberId, (vcLB.get(memberId) || 0) + minutes);
}

module.exports = {
  addChat: trackMessage,
  addVC: trackVoice,

  async executeChat(client) {
    if (!config.CHAT_LB_CHANNEL) return;
    const guild = client.guilds.cache.get(config.ALLOWED_GUILD);
    if (!guild) return;
    const ch = guild.channels.cache.get(config.CHAT_LB_CHANNEL);
    if (!ch) return;

    const embed = createEmbed("Weekly Chat Leaderboard", chatLB, "chat", guild.members.cache);
    chatMsgId = await updateMessage(ch, chatMsgId, embed);
  },

  async executeVC(client) {
    if (!config.VC_LB_CHANNEL) return;
    const guild = client.guilds.cache.get(config.ALLOWED_GUILD);
    if (!guild) return;
    const ch = guild.channels.cache.get(config.VC_LB_CHANNEL);
    if (!ch) return;

    const embed = createEmbed("Weekly VC Leaderboard", vcLB, "vc", guild.members.cache);
    vcMsgId = await updateMessage(ch, vcMsgId, embed);
  },

  async setupChat(message) {
    const embed = createEmbed("Weekly Chat Leaderboard", chatLB, "chat", message.guild.members.cache);
    const msg = await message.channel.send({ embeds: [embed] });
    chatMsgId = msg.id;
  },

  async setupVC(message) {
    const embed = createEmbed("Weekly VC Leaderboard", vcLB, "vc", message.guild.members.cache);
    const msg = await message.channel.send({ embeds: [embed] });
    vcMsgId = msg.id;
  },

  // Auto update interval + weekly reset starter
  start(client) {
    autoUpdate(client);
    scheduleWeeklyReset();
  },

  resetWeekly() {
    chatLB.clear();
    vcLB.clear();
  },
};
