module.exports = {
  TOKEN: process.env.BOT_TOKEN,                 // Bot token from Render secrets
  PREFIX: ".",                                   // Command prefix
  JOIN_TO_CREATE_ID: "1477555779933573233",     // Join-to-create VC channel ID
  CATEGORY_ID: "1477554377387675651",          // Category ID where temp VCs will be created
  CHAT_LB_CHANNEL: null,                        // Optional: chat leaderboard channel ID
  VC_LB_CHANNEL: null,                          // Optional: VC leaderboard channel ID
  ALLOWED_GUILD: "1449708401050259457",        // Your server ID
  PORT: 3000                                    // Default port for hosting
};
