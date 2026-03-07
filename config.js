module.exports = {
  TOKEN: process.env.BOT_TOKEN,                 // Bot token from Render secrets
  PREFIX: ",",                                  // Command prefix changed to ,

  JOIN_TO_CREATE_ID: "1479912627739033772",     // Join-to-create VC channel
  JOIN_TO_UNMUTE_ID: "1479912750053458010",    // Join-to-unmute VC channel

  VOICEMASTER_CATEGORY: "1479911974673453188", // Voicemaster VCs category
  PUBLIC_VC_CATEGORY: "1479912627739033772",   // Public VCs category
  PRIVATE_VC_CATEGORY: "1479912110140948580",  // Private VCs category

  CHAT_LB_CHANNEL: null,                        // Chat leaderboard channel (optional)
  VC_LB_CHANNEL: null,                          // VC leaderboard channel (optional)

  ALLOWED_GUILD: "1449708401050259457",        // Your server ID
  PORT: 3000                                   // Default port for hosting
};
