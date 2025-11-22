const axios = require('axios');

// Roblox API configuration
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY?.trim();
const UNIVERSE_ID = process.env.UNIVERSE_ID?.trim();
const DATASTORE_NAME = 'PlayerData';
const SCOPE = 'global';

// Roblox Open Cloud DataStore API (v1)
const DATASTORE_V1_BASE = `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/standard-datastores`;
const getV1EntryUrl = () => `${DATASTORE_V1_BASE}/datastore/entries/entry`;
const getV1ListUrl = () => `${DATASTORE_V1_BASE}/datastore/entries`;

const buildEntryParams = (key) => ({
  datastoreName: DATASTORE_NAME,
  scope: SCOPE,
  entryKey: key,
});

const buildListParams = (cursor, limit) => ({
  datastoreName: DATASTORE_NAME,
  scope: SCOPE,
  cursor,
  limit,
});

// Helper function to get headers
const getHeaders = () => {
  const apiKey = ROBLOX_API_KEY?.trim();
  
  if (!apiKey) {
    console.error('❌ ERROR: API key is empty or not set');
  }
  
  return {
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
  };
};

// Helper to write (create/update) entries using v1 API
const writeEntry = async (key, value, options = {}) => {
  const params = {
    ...buildEntryParams(key),
  };

  if (options.exclusiveCreate !== undefined) {
    params.exclusiveCreate = options.exclusiveCreate;
  }

  if (options.matchVersion) {
    params.matchVersion = options.matchVersion;
  }

  return axios.post(getV1EntryUrl(), value, {
    headers: getHeaders(),
    params,
  });
};

// Helper function to convert username to userId using Roblox API
const getUserIdFromUsername = async (username) => {
  // If it's already a numeric string, assume it's a userId
  if (/^\d+$/.test(username)) {
    return username;
  }
  
  // Trim and validate username
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    throw new Error('Username cannot be empty');
  }
  
  try {
    const response = await axios.post('https://users.roblox.com/v1/usernames/users', {
      usernames: [cleanUsername],
      excludeBannedUsers: false
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      const users = response.data.data;
      
      const matchedUser = users.find(user => {
        const requestedName = user.requestedUsername || user.name || '';
        return requestedName.toLowerCase() === cleanUsername.toLowerCase();
      });
      
      if (matchedUser && matchedUser.id) {
        return matchedUser.id.toString();
      }
    }
    
    if (response.data && response.data[0] && response.data[0].id) {
      return response.data[0].id.toString();
    }
    
    throw new Error(`User "${cleanUsername}" not found`);
  } catch (error) {
    if (error.response?.status === 404 || error.message.includes('not found')) {
      throw new Error(`User "${cleanUsername}" not found`);
    }
    
    console.error('Username conversion error for:', cleanUsername);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    let errorMessage = error.message;
    if (error.response?.data) {
      if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors[0]?.message || errorMessage;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      }
    }
    
    throw new Error(`Failed to convert username to userId: ${errorMessage}`);
  }
};

// Helper function to convert userId to username using Roblox API
const getUsernameFromUserId = async (userId) => {
  try {
    const response = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
    
    if (response.data && response.data.name) {
      return response.data.name;
    }
    
    return userId;
  } catch (error) {
    console.error('Error converting userId to username:', userId, error.message);
    return userId;
  }
};

// Helper function to convert multiple userIds to usernames in batch
const getUsernamesFromUserIds = async (userIds) => {
  if (!userIds || userIds.length === 0) {
    return [];
  }
  
  try {
    const userIdInts = userIds.map(id => parseInt(id)).filter(id => !isNaN(id));
    
    if (userIdInts.length === 0) {
      return userIds;
    }
    
    const batchSize = 100;
    const usernameMap = new Map();
    
    for (let i = 0; i < userIdInts.length; i += batchSize) {
      const batch = userIdInts.slice(i, i + batchSize);
      
      try {
        const response = await axios.post('https://users.roblox.com/v1/users', {
          userIds: batch
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data?.data && Array.isArray(response.data.data)) {
          response.data.data.forEach(user => {
            if (user.id && user.name) {
              usernameMap.set(user.id.toString(), user.name);
            }
          });
        }
      } catch (error) {
        console.error('Error in batch userId to username conversion, trying individual requests:', error.message);
        for (const userId of batch) {
          try {
            const individualResponse = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
            if (individualResponse.data && individualResponse.data.name) {
              usernameMap.set(userId.toString(), individualResponse.data.name);
            }
          } catch (individualError) {
            console.error(`Failed to get username for userId ${userId}:`, individualError.message);
          }
        }
      }
    }
    
    return userIds.map(userId => usernameMap.get(userId) || userId);
  } catch (error) {
    console.error('Error converting userIds to usernames:', error.message);
    return userIds;
  }
};

// Helper function to get player key
const getPlayerKey = (userId) => `Player_${userId}`;

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

module.exports = {
  ROBLOX_API_KEY,
  UNIVERSE_ID,
  DATASTORE_NAME,
  SCOPE,
  getV1EntryUrl,
  getV1ListUrl,
  buildEntryParams,
  buildListParams,
  getHeaders,
  writeEntry,
  getUserIdFromUsername,
  getUsernameFromUserId,
  getUsernamesFromUserIds,
  getPlayerKey,
  corsHeaders,
};

