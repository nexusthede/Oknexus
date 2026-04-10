const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./vc.sqlite");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS vc_time (
      guildId TEXT,
      userId TEXT,
      time INTEGER DEFAULT 0,
      PRIMARY KEY (guildId, userId)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_time (
      guildId TEXT,
      userId TEXT,
      messages INTEGER DEFAULT 0,
      PRIMARY KEY (guildId, userId)
    )
  `);
});

module.exports = db;
