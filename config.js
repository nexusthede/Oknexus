module.exports = {
  TOKEN: process.env.BOT_TOKEN,                 // Bot token from Render secrets
  PREFIX: ",",                                  // Command prefix

  // Welcome channel
  WELCOME_CHANNEL: "1478693017559765063",      // Channel to send welcome messages

  // Join-to-create / Join-to-unmute
  JOIN_TO_CREATE_ID: "1480978441980477440",    
  JOIN_TO_UNMUTE_ID: "1480978490697187478",   

  // VC categories
  VOICEMASTER_CATEGORY: "1480977750218248222", 
  PUBLIC_VC_CATEGORY: "1480977801015459973",   
  PRIVATE_VC_CATEGORY: "1480977835211493416",  

  // Leaderboard channels (optional)
  CHAT_LB_CHANNEL: null,                        
  VC_LB_CHANNEL: null,                          

  ALLOWED_GUILD: "1449708401050259457",        
  PORT: 3000                                    
};
