const axios = require('axios');

// Roblox API configuration
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY?.trim();
const UNIVERSE_ID = process.env.UNIVERSE_ID?.trim();
const DATASTORE_NAME = process.env.DATASTORE_NAME?.trim() || 'PlayerData'; // Configurable via environment variable
const SCOPE = process.env.DATASTORE_SCOPE?.trim() || 'global'; // Configurable via environment variable

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
    throw new Error('ROBLOX_API_KEY environment variable is not set');
  }
  
  const universeId = UNIVERSE_ID?.trim();
  if (!universeId) {
    console.error('❌ ERROR: UNIVERSE_ID is empty or not set');
    throw new Error('UNIVERSE_ID environment variable is not set');
  }
  
  // Log for debugging (especially useful on Vercel)
  console.log('API Configuration:', {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey.length,
    universeId: universeId,
    universeIdLength: universeId.length,
    universeIdRaw: JSON.stringify(process.env.UNIVERSE_ID),
    datastoreName: DATASTORE_NAME,
    datastoreNameRaw: JSON.stringify(process.env.DATASTORE_NAME),
    isVercel: !!process.env.VERCEL
  });
  
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

// Cache for username to userId conversions (to avoid redundant API calls)
const usernameCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// Rate limiting: track last request time and enforce minimum delay
let lastRequestTime = 0;
const MIN_REQUEST_DELAY = 100; // Minimum 100ms between requests (10 requests/second max)

// Helper function to sleep/delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to convert username to userId using Roblox API
const getUserIdFromUsername = async (username, retryCount = 0) => {
  // If it's already a numeric string, assume it's a userId
  if (/^\d+$/.test(username)) {
    return username;
  }
  
  // Trim and validate username
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    throw new Error('Username cannot be empty');
  }
  
  // Check cache first
  const cacheKey = cleanUsername.toLowerCase();
  const cached = usernameCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.userId;
  }
  
  // Rate limiting: ensure minimum delay between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_DELAY) {
    await sleep(MIN_REQUEST_DELAY - timeSinceLastRequest);
  }
  
  try {
    lastRequestTime = Date.now();
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
        const userId = matchedUser.id.toString();
        // Cache the result
        usernameCache.set(cacheKey, { userId, timestamp: Date.now() });
        return userId;
      }
    }
    
    if (response.data && response.data[0] && response.data[0].id) {
      const userId = response.data[0].id.toString();
      // Cache the result
      usernameCache.set(cacheKey, { userId, timestamp: Date.now() });
      return userId;
    }
    
    throw new Error(`User "${cleanUsername}" not found`);
  } catch (error) {
    // Handle 429 (Too Many Requests) with retry logic
    if (error.response?.status === 429) {
      const maxRetries = 3;
      if (retryCount < maxRetries) {
        // Exponential backoff: wait 2^retryCount seconds (with jitter)
        const baseDelay = Math.pow(2, retryCount) * 1000;
        const jitter = Math.random() * 1000; // Add random jitter up to 1 second
        const delay = baseDelay + jitter;
        
        console.warn(`Rate limited (429) for username "${cleanUsername}". Retrying in ${Math.round(delay)}ms (attempt ${retryCount + 1}/${maxRetries})...`);
        await sleep(delay);
        
        // Recursive retry
        return getUserIdFromUsername(username, retryCount + 1);
      } else {
        console.error(`Rate limited (429) for username "${cleanUsername}". Max retries (${maxRetries}) exceeded.`);
        throw new Error(`Rate limited: Too many requests. Please try again later.`);
      }
    }
    
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

// Helper function to get nametag prefix key
const getNametagPrefixKey = (userId) => `uid_${userId}`;

// Helper function to build entry params for nametag prefix datastore
const buildNametagPrefixEntryParams = (key) => ({
  datastoreName: 'NameTagPrefix_Custom_v1',
  scope: SCOPE,
  entryKey: key,
});

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Authentication helper for token-based auth
const crypto = require('crypto');
const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret-change-in-production';

function verifyToken(token) {
  try {
    if (!token) return null;
    
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const { signature, ...payload } = decoded;
    
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Check if token is expired (24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - decoded.timestamp > maxAge) {
      return null;
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
}

function authenticate(req) {
  // Get token from Authorization header or query parameter
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7)
    : req.query.token || req.body?.token;
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return { authenticated: false, error: 'Unauthorized - Please login' };
  }
  
  return { authenticated: true, username: decoded.username };
}

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
  getNametagPrefixKey,
  buildNametagPrefixEntryParams,
  corsHeaders,
  authenticate,
  verifyToken,
};

