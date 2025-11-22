const {
  ROBLOX_API_KEY,
  UNIVERSE_ID,
  DATASTORE_NAME,
  corsHeaders,
} = require('./utils');

module.exports = async (req, res) => {
  // Set CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });

  return res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    config: {
      universeId: UNIVERSE_ID,
      datastoreName: DATASTORE_NAME,
      apiKeyConfigured: !!ROBLOX_API_KEY,
      apiKeyLength: ROBLOX_API_KEY ? ROBLOX_API_KEY.length : 0,
    }
  });
};

