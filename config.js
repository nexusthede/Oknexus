module.exports = {
  TOKEN: process.env.BOT_TOKEN,                 // Bot token from Render secrets
  PREFIX: ",",                                  // Command prefix

  // Join-to-create / Join-to-unmute
  JOIN_TO_CREATE_ID: "1480978441980477440",     // Join-to-create VC channel
  JOIN_TO_UNMUTE_ID: "1480978490697187478",    // Join-to-unmute VC channel

  // VC categories
  VOICEMASTER_CATEGORY: "1480977750218248222", // Voicemaster VCs category
  PUBLIC_VC_CATEGORY: "1480977801015459973",   // Public VCs category
  PRIVATE_VC_CATEGORY: "1480977835211493416",  // Private VCs category

  // Leaderboard channels (optional)
  CHAT_LB_CHANNEL: null,                        // Chat leaderboard channel
  VC_LB_CHANNEL: null,                          // VC leaderboard channel

  ALLOWED_GUILD: "1449708401050259457",        // Your server ID
  PORT: 3000                                    // Default port for hosting
};
