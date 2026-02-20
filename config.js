module.exports = {
  TOKEN: process.env.BOT_TOKEN, // required, bot token
  PREFIX: process.env.BOT_PREFIX || ".", // defaults to "."
  JOIN_TO_CREATE_ID: process.env.JOIN_VC_CHANNEL || "1474219896190668892",
  CATEGORY_ID: process.env.VC_CATEGORY || "1474219814305402930",
  CHAT_LB_CHANNEL: process.env.CHAT_LB_CHANNEL || null, // optional, can set via .set
  VC_LB_CHANNEL: process.env.VC_LB_CHANNEL || null,     // optional, can set via .set
  ALLOWED_GUILD: process.env.ALLOWED_GUILD || "1449708401050259457", // your server only
  PORT: process.env.PORT || 3000 // for Render/BetterStack health ping
};
