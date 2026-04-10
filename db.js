const Database = require("better-sqlite3");

const db = new Database("vc.sqlite");

db.exec(`
CREATE TABLE IF NOT EXISTS vc_time (
  guildId TEXT,
  userId TEXT,
  time INTEGER DEFAULT 0,
  PRIMARY KEY (guildId, userId)
);

CREATE TABLE IF NOT EXISTS chat_time (
  guildId TEXT,
  userId TEXT,
  messages INTEGER DEFAULT 0,
  PRIMARY KEY (guildId, userId)
);

CREATE TABLE IF NOT EXISTS settings (
  guildId TEXT PRIMARY KEY,
  channelId TEXT,
  messageId TEXT
);
`);

module.exports = db;
