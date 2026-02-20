module.exports = {
  TOKEN: process.env.BOT_TOKEN,
  PREFIX: process.env.BOT_PREFIX || ".",
  JOIN_TO_CREATE_ID: process.env.JOIN_VC_CHANNEL || "1474219896190668892",
  CATEGORY_ID: process.env.VC_CATEGORY || "1474219814305402930",
  CHAT_LB_CHANNEL: null, // Set with .set chatlb
  VC_LB_CHANNEL: null,   // Set with .set vclb
};
