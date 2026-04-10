const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const db = require("./db");

function format(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

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

function
