const { EmbedBuilder } = require("discord.js");
const db = require("./db");

// format VC time
function format(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

// reset countdown
function resetIn() {
  const now = new Date();
  const next = new Date();
  const diff = (7 - now.getDay()) % 7;

  next.setDate(now.getDate() + diff);
  next.setHours(0, 0, 0, 0);

  const ms = next - now;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);

  return `${d}d ${h}h ${m}m`;
}

function buildVC(guild) {
  const top = db.prepare(`
    SELECT * FROM vc_time
    WHERE guildId = ?
    ORDER BY time DESC
    LIMIT 10
  `).all(guild.id);

  let desc = top.map((u, i) =>
    `**${i + 1}.** <@${u.userId}> - ${format(u.time)}`
  ).join("\n");

  desc += `\n\nResets in: ${resetIn()}`;

  return new EmbedBuilder()
    .setTitle("Voice Leaderboard")
    .setColor("#2B2D31")
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .setDescription(desc)
    .setFooter({ text: "Updates every 10 mins • Resets weekly" });
}

function buildCHAT(guild) {
  const top = db.prepare(`
    SELECT * FROM chat_time
    WHERE guildId = ?
    ORDER BY messages DESC
    LIMIT 10
  `).all(guild.id);

  let desc = top.map((u, i) =>
    `**${i + 1}.** <@${u.userId}> - ${u.messages} msgs`
  ).join("\n");

  desc += `\n\nResets in: ${resetIn()}`;

  return new EmbedBuilder()
    .setTitle("Chat Leaderboard")
    .setColor("#2B2D31")
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .setDescription(desc)
    .setFooter({ text: "Updates every 10 mins • Resets weekly" });
}

module.exports = { buildVC, buildCHAT };
