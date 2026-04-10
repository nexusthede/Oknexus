const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const db = require("./db");

// format VC time
function format(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

// SAFE weekly reset (no timezone bugs)
function resetIn() {
  const now = new Date();
  const next = new Date();

  next.setUTCHours(0, 0, 0, 0);
  next.setUTCDate(next.getUTCDate() + ((7 - next.getUTCDay()) % 7));

  const ms = next - now;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);

  return `${d}d ${h}h ${m}m`;
}

// VC LEADERBOARD
function buildVC(guild) {
  const top = db.prepare(`
    SELECT * FROM vc_time
    WHERE guildId = ?
    ORDER BY time DESC
    LIMIT 10
  `).all(guild.id);

  const desc = top.length
    ? top.map((u, i) =>
        `**${i + 1}.** <@${u.userId}> - ${format(u.time)}`
      ).join("\n")
    : "No VC data yet.";

  return new EmbedBuilder()
    .setTitle("Voice Leaderboard")
    .setColor("#2B2D31")
    .setThumbnail(guild.iconURL({ dynamic: true }) || null)
    .setDescription(`${desc}\n\nResets in: ${resetIn()}`)
    .setFooter({ text: "Updates every 10 mins • Resets weekly" });
}

// CHAT LEADERBOARD
function buildCHAT(guild) {
  const top = db.prepare(`
    SELECT * FROM chat_time
    WHERE guildId = ?
    ORDER BY messages DESC
    LIMIT 10
  `).all(guild.id);

  const desc = top.length
    ? top.map((u, i) =>
        `**${i + 1}.** <@${u.userId}> - ${u.messages} msgs`
      ).join("\n")
    : "No chat data yet.";

  return new EmbedBuilder()
    .setTitle("Chat Leaderboard")
    .setColor("#2B2D31")
    .setThumbnail(guild.iconURL({ dynamic: true }) || null)
    .setDescription(`${desc}\n\nResets in: ${resetIn()}`)
    .setFooter({ text: "Updates every 10 mins • Resets weekly" });
}

// ADMIN COMMANDS (= prefix)
async function handleCommands(message) {
  if (!message.guild || message.author.bot) return;

  const isAdmin = message.member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );

  if (!isAdmin) return;

  const cmd = message.content.toLowerCase();

  if (cmd === "=vclb") {
    return message.channel.send({ embeds: [buildVC(message.guild)] });
  }

  if (cmd === "=chatlb") {
    return message.channel.send({ embeds: [buildCHAT(message.guild)] });
  }

  if (cmd === "=lb") {
    return message.channel.send({
      embeds: [buildVC(message.guild), buildCHAT(message.guild)]
    });
  }
}

module.exports = { buildVC, buildCHAT, handleCommands };
