const express = require('express');
const cors = require('cors');
const axios = require('axios');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware
app.use(cors({
  origin: true, // Allow all origins (adjust for production)
  credentials: true // Allow cookies
}));
app.use(express.json());

// Import authentication
const { authenticate, handleLogin, handleLogout, checkAuth } = require('./auth');

// Roblox API configuration
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY?.trim(); // Trim whitespace
const UNIVERSE_ID = process.env.UNIVERSE_ID?.trim(); // Trim whitespace
const DATASTORE_NAME = process.env.DATASTORE_NAME?.trim() || 'PlayerData'; // Configurable via environment variable
const SCOPE = process.env.DATASTORE_SCOPE?.trim() || 'global'; // Configurable via environment variable

// ------------ Roblox Open Cloud DataStore API (v1 - documented/stable) ------------
// Format: https://apis.roblox.com/datastores/v1/universes/{universeId}/standard-datastores
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

// Validate and log API key on startup
if (ROBLOX_API_KEY) {
  console.log('API Key loaded:');
  console.log('  Length:', ROBLOX_API_KEY.length);
  console.log('  First 20 chars:', ROBLOX_API_KEY.substring(0, 20));
  console.log('  Last 20 chars:', ROBLOX_API_KEY.substring(ROBLOX_API_KEY.length - 20));
  console.log('  Contains newlines:', ROBLOX_API_KEY.includes('\n'));
  console.log('  Contains spaces:', ROBLOX_API_KEY.includes(' '));
  
  // Warn if key seems too long (Roblox keys are typically 100-200 chars)
  if (ROBLOX_API_KEY.length > 300) {
    console.warn('⚠️  WARNING: API key seems unusually long. Make sure there are no extra characters or newlines.');
  }
} else {
  console.error('❌ ERROR: ROBLOX_API_KEY not set in .env file');
}

// Helper function to get headers
// Roblox Cloud API v2 uses x-api-key header (same as v1)
const getHeaders = () => {
  // Ensure API key is trimmed and has no extra whitespace
  const apiKey = ROBLOX_API_KEY?.trim();
  
  if (!apiKey) {
    console.error('❌ ERROR: API key is empty or not set');
  }
  
  return {
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
  };
};

// Validate API key and universe ID on startup
if (!ROBLOX_API_KEY || !UNIVERSE_ID) {
  console.warn('⚠️  Warning: ROBLOX_API_KEY or UNIVERSE_ID not set in .env file');
}

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
    // Use Roblox Users API to get user by username
    // This endpoint requires a POST request with JSON payload
    lastRequestTime = Date.now();
    const response = await axios.post('https://users.roblox.com/v1/usernames/users', {
      usernames: [cleanUsername],
      excludeBannedUsers: false
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Check response structure - the API returns data in response.data.data array
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      const users = response.data.data;
      
      // Find the user that matches the requested username (case-insensitive)
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
    
    // If no match found, try alternative response structure
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
    
    // If it's a 404 or "not found" error, return a clear message
    if (error.response?.status === 404 || error.message.includes('not found')) {
      throw new Error(`User "${cleanUsername}" not found`);
    }
    
    // Log the full error for debugging
    console.error('Username conversion error for:', cleanUsername);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    // Extract error message from response
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
    // Use Roblox Users API to get user by userId
    // Endpoint: GET https://users.roblox.com/v1/users/{userId}
    const response = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
    
    if (response.data && response.data.name) {
      return response.data.name;
    }
    
    return userId; // Fallback to userId if not found
  } catch (error) {
    console.error('Error converting userId to username:', userId, error.message);
    return userId; // Fallback to userId on error
  }
};

// Helper function to convert multiple userIds to usernames in batch
const getUsernamesFromUserIds = async (userIds) => {
  if (!userIds || userIds.length === 0) {
    return [];
  }
  
  try {
    // Convert string userIds to integers and filter invalid ones
    const userIdInts = userIds.map(id => parseInt(id)).filter(id => !isNaN(id));
    
    if (userIdInts.length === 0) {
      return userIds; // Return original if no valid userIds
    }
    
    // Use Roblox Users API to get users by userIds (batch request)
    // Endpoint: POST https://users.roblox.com/v1/users with body: { userIds: [array] }
    const batchSize = 100;
    const usernameMap = new Map();
    
    for (let i = 0; i < userIdInts.length; i += batchSize) {
      const batch = userIdInts.slice(i, i + batchSize);
      
      try {
        // Try the POST endpoint with userIds array in body
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
        // If batch fails, try individual requests as fallback
        console.error('Error in batch userId to username conversion, trying individual requests:', error.message);
        for (const userId of batch) {
          try {
            const individualResponse = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
            if (individualResponse.data && individualResponse.data.name) {
              usernameMap.set(userId.toString(), individualResponse.data.name);
            }
          } catch (individualError) {
            // Skip this userId if it fails
            console.error(`Failed to get username for userId ${userId}:`, individualError.message);
          }
        }
      }
    }
    
    // Map userIds to usernames, fallback to userId if not found
    return userIds.map(userId => usernameMap.get(userId) || userId);
  } catch (error) {
    console.error('Error converting userIds to usernames:', error.message);
    return userIds; // Fallback to original userIds on error
  }
};

// Helper function to get player key
// Note: Based on actual data, keys use "Player_" (capital P) and are in "global" scope
// The userId parameter should be the numeric userId string
const getPlayerKey = (userId) => `Player_${userId}`;

// Helper function to get nametag prefix key
const getNametagPrefixKey = (userId) => `uid_${userId}`;

// Helper function to build entry params for nametag prefix datastore
const buildNametagPrefixEntryParams = (key) => ({
  datastoreName: 'NameTagPrefix_Custom_v1',
  scope: SCOPE,
  entryKey: key,
});

// ============ Authentication Routes (Public) ============
// Login endpoint
app.post('/api/auth/login', handleLogin);

// Logout endpoint
app.post('/api/auth/logout', handleLogout);

// Check authentication status
app.get('/api/auth/check', checkAuth);

// ============ Protected API Routes ============
// All player data routes require authentication
// GET - Read player data
app.get('/api/players/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    // Convert username to userId
    const userId = await getUserIdFromUsername(username);
    const key = getPlayerKey(userId);
    
    const response = await axios.get(getV1EntryUrl(), {
      headers: getHeaders(),
      params: buildEntryParams(key),
      responseType: 'text',
    });
    
    let data = response.data;
    try {
      data = JSON.parse(response.data);
    } catch (parseError) {
      // leave as raw text if not JSON
    }
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    // Check if error is from username conversion
    if (error.message && (error.message.includes('not found') || error.message.includes('convert username'))) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Player data not found'
      });
    }
    
    // Extract error message from various possible response formats
    let errorMessage = 'Failed to read player data';
    if (error.response?.data) {
      errorMessage = error.response.data.message || 
                    error.response.data.error || 
                    error.response.data.errorMessage ||
                    JSON.stringify(error.response.data);
      
      // Log full error for debugging
      console.error('\n=== API Error Details ===');
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Request URL:', error.config?.url);
      console.error('Request Headers:', JSON.stringify({ ...error.config?.headers, 'x-api-key': '***HIDDEN***' }, null, 2));
    } else {
      console.error('Request Error:', error.message);
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: errorMessage,
      status: error.response?.status,
      details: error.response?.data
    });
  }
});

// POST - Create/Update player data
app.post('/api/players/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    const { data } = req.body;
    // Convert username to userId
    const userId = await getUserIdFromUsername(username);
    const key = getPlayerKey(userId);
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required'
      });
    }
    
    const response = await writeEntry(key, data);
    
    res.json({
      success: true,
      data: response.data || {},
      message: 'Player data saved successfully'
    });
  } catch (error) {
    // Check if error is from username conversion
    if (error.message && (error.message.includes('not found') || error.message.includes('convert username'))) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    // Extract error message from various possible response formats
    let errorMessage = 'Failed to create/update player data';
    if (error.response?.data) {
      errorMessage = error.response.data.message || 
                    error.response.data.error || 
                    error.response.data.errorMessage ||
                    JSON.stringify(error.response.data);
      
      // Log full error for debugging
      console.error('\n=== API Error Details ===');
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Request URL:', error.config?.url);
      console.error('Request Headers:', JSON.stringify({ ...error.config?.headers, 'x-api-key': '***HIDDEN***' }, null, 2));
    } else {
      console.error('Request Error:', error.message);
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: errorMessage,
      status: error.response?.status,
      details: error.response?.data
    });
  }
});

// PUT - Update player data
// Note: Since POST works for create/update, we'll just use POST internally
// This keeps the API consistent - PUT endpoint uses POST logic
app.put('/api/players/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    const { data } = req.body;
    // Convert username to userId
    const userId = await getUserIdFromUsername(username);
    const key = getPlayerKey(userId);
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required'
      });
    }
    
    const response = await writeEntry(key, data);
    
    res.json({
      success: true,
      data: response.data || {},
      message: 'Player data updated successfully'
    });
  } catch (error) {
    // Check if error is from username conversion
    if (error.message && (error.message.includes('not found') || error.message.includes('convert username'))) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    // Extract error message from various possible response formats
    let errorMessage = 'Failed to update player data';
    if (error.response?.data) {
      const errors = error.response.data.errors || [];
      if (errors.length > 0 && errors[0].message) {
        errorMessage = errors[0].message;
      } else {
        errorMessage = error.response.data.message || 
                      error.response.data.error || 
                      error.response.data.errorMessage ||
                      JSON.stringify(error.response.data);
      }
      
      // Log full error for debugging
      console.error('\n=== PUT Error Details ===');
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Request URL:', error.config?.url);
      console.error('Request Method:', error.config?.method);
      console.error('Request Headers:', JSON.stringify({ ...error.config?.headers, 'x-api-key': '***HIDDEN***' }, null, 2));
      console.error('Request Data:', JSON.stringify(error.config?.data, null, 2));
    } else {
      console.error('Request Error:', error.message);
      console.error('Error Stack:', error.stack);
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: errorMessage,
      status: error.response?.status,
      details: error.response?.data
    });
  }
});

// DELETE - Delete player data
app.delete('/api/players/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    // Convert username to userId
    const userId = await getUserIdFromUsername(username);
    const key = getPlayerKey(userId);
    
    await axios.delete(getV1EntryUrl(), {
      headers: getHeaders(),
      params: buildEntryParams(key),
    });
    
    res.json({
      success: true,
      message: 'Player data deleted successfully'
    });
  } catch (error) {
    // Check if error is from username conversion
    if (error.message && (error.message.includes('not found') || error.message.includes('convert username'))) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Player data not found'
      });
    }
    
    // Extract error message from various possible response formats
    let errorMessage = 'Failed to delete player data';
    if (error.response?.data) {
      errorMessage = error.response.data.message || 
                    error.response.data.error || 
                    error.response.data.errorMessage ||
                    JSON.stringify(error.response.data);
      
      // Log full error for debugging
      console.error('\n=== API Error Details ===');
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Request URL:', error.config?.url);
      console.error('Request Headers:', JSON.stringify({ ...error.config?.headers, 'x-api-key': '***HIDDEN***' }, null, 2));
    } else {
      console.error('Request Error:', error.message);
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: errorMessage,
      status: error.response?.status,
      details: error.response?.data
    });
  }
});

// GET - List all players (using ListEntries endpoint)
app.get('/api/players', authenticate, async (req, res) => {
  try {
    const { cursor, limit = 100 } = req.query;
    // Cap limit at 100 for performance with large datasets (1M+ entries)
    const cappedLimit = Math.min(parseInt(limit) || 100, 100);
    
    const params = {
      datastoreName: DATASTORE_NAME,
      scope: SCOPE,
      limit: cappedLimit,
      cursor,
    };
    
    const response = await axios.get(getV1ListUrl(), {
      headers: getHeaders(),
      params,
    });
    
    // Handle both response formats: entries array or keys array
    let entries = response.data?.entries || [];
    let userIds = [];
    
    if (entries.length > 0) {
      // Format 1: entries array with entryKey property
      userIds = entries.map((entry) => {
        const match = entry.entryKey?.match(/Player_(\d+)/);
        return match ? match[1] : entry.entryKey;
      });
    } else if (response.data?.keys && response.data.keys.length > 0) {
      // Format 2: keys array directly
      entries = response.data.keys;
      userIds = response.data.keys.map((keyObj) => {
        // Handle both string keys and object keys with 'key' property
        const key = typeof keyObj === 'string' ? keyObj : keyObj.key || keyObj.entryKey;
        const match = key?.match(/Player_(\d+)/);
        return match ? match[1] : key;
      });
    }
    
    // Convert userIds to usernames
    const usernames = await getUsernamesFromUserIds(userIds);
    
    res.json({
      success: true,
      data: {
        keys: usernames, // Return usernames instead of userIds
        userIds: userIds, // Also include userIds for reference
        entries,
        nextPageToken: response.data?.nextPageCursor || null,
        original: response.data,
      },
    });
  } catch (error) {
    // Extract error message from various possible response formats
    let errorMessage = 'Failed to list players';
    if (error.response?.data) {
      errorMessage = error.response.data.message || 
                    error.response.data.error || 
                    error.response.data.errorMessage ||
                    JSON.stringify(error.response.data);
      
      // Log full error for debugging
      console.error('\n=== API Error Details ===');
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Request URL:', error.config?.url);
      console.error('Request Headers:', JSON.stringify({ ...error.config?.headers, 'x-api-key': '***HIDDEN***' }, null, 2));
    } else {
      console.error('Request Error:', error.message);
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: errorMessage,
      status: error.response?.status,
      details: error.response?.data
    });
  }
});

// ============ Leaderboard Route ============
// Helper function to make rate-limited requests with exponential backoff
const makeRateLimitedRequest = async (requestFn, retries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await requestFn();
      
      // If we get a 429, wait and retry
      if (response.status === 429) {
        if (attempt < retries) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`Rate limited (429), waiting ${delay}ms before retry ${attempt + 1}/${retries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      return response;
    } catch (error) {
      // Handle 429 errors
      if (error.response?.status === 429) {
        if (attempt < retries) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Rate limited (429), waiting ${delay}ms before retry ${attempt + 1}/${retries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
};

// Helper to delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// In-memory cache for leaderboard
const leaderboardCache = {
  data: null,
  timestamp: null,
  ttl: 10 * 60 * 1000, // 10 minutes TTL
};

// Function to check if cache is valid
const isCacheValid = () => {
  if (!leaderboardCache.data || !leaderboardCache.timestamp) {
    return false;
  }
  const age = Date.now() - leaderboardCache.timestamp;
  return age < leaderboardCache.ttl;
};

// Function to fetch and process leaderboard (the expensive operation)
const fetchLeaderboardData = async (topLimit, maxSample) => {
  console.log(`Fetching leaderboard: top ${topLimit}, sampling ${maxSample} players`);

  let allCandidates = [];
  let cursor = null;
  let pagesFetched = 0;
  const maxPages = Math.ceil(maxSample / 100);

  while (pagesFetched < maxPages && allCandidates.length < maxSample) {
    const params = {
      datastoreName: DATASTORE_NAME,
      scope: SCOPE,
      limit: 100,
      cursor,
    };

    const listResponse = await makeRateLimitedRequest(async () => {
      return await axios.get(getV1ListUrl(), {
        headers: getHeaders(),
        params,
      });
    });

    let entries = listResponse.data?.entries || [];
    let userIds = [];

    if (entries.length > 0) {
      userIds = entries.map((entry) => {
        const match = entry.entryKey?.match(/Player_(\d+)/);
        return match ? match[1] : entry.entryKey;
      });
    } else if (listResponse.data?.keys && listResponse.data.keys.length > 0) {
      entries = listResponse.data.keys;
      userIds = listResponse.data.keys.map((keyObj) => {
        const key = typeof keyObj === 'string' ? keyObj : keyObj.key || keyObj.entryKey;
        const match = key?.match(/Player_(\d+)/);
        return match ? match[1] : key;
      });
    }

    if (userIds.length === 0) {
      break;
    }

    const batchSize = 5;
    for (let i = 0; i < userIds.length && allCandidates.length < maxSample; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      for (const userId of batch) {
        try {
          const key = getPlayerKey(userId);
          const entryParams = buildEntryParams(key);
          
          const playerResponse = await makeRateLimitedRequest(async () => {
            return await axios.get(getV1EntryUrl(), {
              headers: getHeaders(),
              params: entryParams,
              validateStatus: (status) => status < 500,
            });
          });

          if (playerResponse.status === 404) {
            continue;
          }

          let data = playerResponse.data;
          try {
            if (typeof data === 'string' && data.trim()) {
              data = JSON.parse(data);
            }
          } catch (e) {
            // Keep as raw data if not JSON
          }

          const summit = data?.summit || 
                        data?.summits || 
                        data?.bestSummit || 
                        data?.highestSummit || 
                        data?.Summits ||
                        data?.Summit ||
                        0;

          const summitValue = Number(summit) || 0;
          
          if (summitValue > 0) {
            allCandidates.push({
              userId,
              summit: summitValue,
              data
            });
          }
        } catch (error) {
          if (error.response?.status === 429) {
            console.error('Rate limit exceeded after retries. Stopping leaderboard fetch.');
            break;
          }
          console.error(`Error fetching data for userId ${userId}:`, error.message);
        }
        
        await delay(200);
      }

      if (i + batchSize < userIds.length) {
        await delay(500);
      }
    }

    cursor = listResponse.data?.nextPageCursor || null;
    pagesFetched++;

    if (!cursor) break;

    await delay(1000);
  }

  const sorted = allCandidates
    .sort((a, b) => b.summit - a.summit)
    .slice(0, topLimit);

  const userIdsToConvert = sorted.map(p => p.userId);
  const usernames = await getUsernamesFromUserIds(userIdsToConvert);

  const leaderboard = sorted.map((player, index) => ({
    rank: index + 1,
    username: usernames[index] || player.userId,
    userId: player.userId,
    summit: player.summit,
  }));

  return {
    leaderboard,
    sampleSize: allCandidates.length,
    totalSampled: allCandidates.length,
    pagesFetched,
    timestamp: Date.now(),
  };
};

// GET - Get top summits leaderboard
app.get('/api/leaderboard', authenticate, async (req, res) => {
  try {
    const { limit = 10, sampleSize = 2000, forceRefresh = false } = req.query;
    const topLimit = Math.min(parseInt(limit) || 10, 50);
    const maxSample = Math.min(parseInt(sampleSize) || 2000, 10000);
    const shouldForceRefresh = forceRefresh === 'true' || forceRefresh === true;

    // Check cache first (unless force refresh is requested)
    if (!shouldForceRefresh && isCacheValid()) {
      console.log('Serving leaderboard from cache');
      const cachedData = leaderboardCache.data;
      
      const limitedLeaderboard = cachedData.leaderboard.slice(0, topLimit);
      
      return res.json({
        success: true,
        data: {
          leaderboard: limitedLeaderboard,
          sampleSize: cachedData.sampleSize,
          totalSampled: cachedData.totalSampled,
          cached: true,
          cacheAge: Math.round((Date.now() - cachedData.timestamp) / 1000),
          note: `Leaderboard from cache (${cachedData.sampleSize} players sampled). Add ?forceRefresh=true to refresh.`
        }
      });
    }

    // Cache miss or force refresh - fetch fresh data
    console.log(shouldForceRefresh ? 'Force refreshing leaderboard...' : 'Cache expired, fetching fresh leaderboard...');
    
    const leaderboardData = await fetchLeaderboardData(topLimit, maxSample);

    // Update cache
    leaderboardCache.data = leaderboardData;
    leaderboardCache.timestamp = leaderboardData.timestamp;

    res.json({
      success: true,
      data: {
        leaderboard: leaderboardData.leaderboard,
        sampleSize: leaderboardData.sampleSize,
        totalSampled: leaderboardData.totalSampled,
        cached: false,
        note: `Leaderboard based on sample of ${leaderboardData.sampleSize} players from ${leaderboardData.pagesFetched} pages. Cached for 10 minutes.`
      }
    });

    console.log(`Fetching leaderboard: top ${topLimit}, sampling ${maxSample} players`);

    // Fetch players in batches
    let allCandidates = [];
    let cursor = null;
    let pagesFetched = 0;
    const maxPages = Math.ceil(maxSample / 100);

    while (pagesFetched < maxPages && allCandidates.length < maxSample) {
      const params = {
        datastoreName: DATASTORE_NAME,
        scope: SCOPE,
        limit: 100,
        cursor,
      };

      // Use rate-limited request for list endpoint
      const listResponse = await makeRateLimitedRequest(async () => {
        return await axios.get(getV1ListUrl(), {
          headers: getHeaders(),
          params,
        });
      });

      // Extract userIds from response
      let entries = listResponse.data?.entries || [];
      let userIds = [];

      if (entries.length > 0) {
        userIds = entries.map((entry) => {
          const match = entry.entryKey?.match(/Player_(\d+)/);
          return match ? match[1] : entry.entryKey;
        });
      } else if (listResponse.data?.keys && listResponse.data.keys.length > 0) {
        entries = listResponse.data.keys;
        userIds = listResponse.data.keys.map((keyObj) => {
          const key = typeof keyObj === 'string' ? keyObj : keyObj.key || keyObj.entryKey;
          const match = key?.match(/Player_(\d+)/);
          return match ? match[1] : key;
        });
      }

      if (userIds.length === 0) {
        break;
      }

      // Fetch player data sequentially with delays to avoid rate limits
      // Process smaller batches to respect rate limits
      const batchSize = 5; // Reduced from 20 to 5 to avoid rate limits
      for (let i = 0; i < userIds.length && allCandidates.length < maxSample; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        // Process batch sequentially with delays
        for (const userId of batch) {
          try {
            const key = getPlayerKey(userId);
            const entryParams = buildEntryParams(key);
            
            // Use rate-limited request with retry logic
            const playerResponse = await makeRateLimitedRequest(async () => {
              return await axios.get(getV1EntryUrl(), {
                headers: getHeaders(),
                params: entryParams,
                validateStatus: (status) => status < 500,
              });
            });

            if (playerResponse.status === 404) {
              continue; // Skip 404s
            }

            let data = playerResponse.data;
            try {
              if (typeof data === 'string' && data.trim()) {
                data = JSON.parse(data);
              }
            } catch (e) {
              // Keep as raw data if not JSON
            }

            // Look for summit-related fields
            const summit = data?.summit || 
                          data?.summits || 
                          data?.bestSummit || 
                          data?.highestSummit || 
                          data?.Summits ||
                          data?.Summit ||
                          0;

            const summitValue = Number(summit) || 0;
            
            if (summitValue > 0) {
              allCandidates.push({
                userId,
                summit: summitValue,
                data
              });
            }
          } catch (error) {
            // If it's a rate limit error after retries, stop processing
            if (error.response?.status === 429) {
              console.error('Rate limit exceeded after retries. Stopping leaderboard fetch.');
              break;
            }
            console.error(`Error fetching data for userId ${userId}:`, error.message);
          }
          
          // Delay between individual requests to respect rate limits
          await delay(200); // 200ms delay between each player request
        }

        // Longer delay between batches
        if (i + batchSize < userIds.length) {
          await delay(500); // 500ms delay between batches
        }
      }

      cursor = listResponse.data?.nextPageCursor || null;
      pagesFetched++;

      if (!cursor) break;

      // Longer delay between pages to avoid rate limiting
      await delay(1000); // 1 second delay between pages
    }

    // Sort by summit value and get top N
    const sorted = allCandidates
      .sort((a, b) => b.summit - a.summit)
      .slice(0, topLimit);

    // Convert userIds to usernames
    const userIdsToConvert = sorted.map(p => p.userId);
    const usernames = await getUsernamesFromUserIds(userIdsToConvert);

    // Combine with usernames
    const leaderboard = sorted.map((player, index) => ({
      rank: index + 1,
      username: usernames[index] || player.userId,
      userId: player.userId,
      summit: player.summit,
    }));

    res.json({
      success: true,
      data: {
        leaderboard,
        sampleSize: allCandidates.length,
        totalSampled: allCandidates.length,
        note: `Leaderboard based on sample of ${allCandidates.length} players from ${pagesFetched} pages`
      }
    });
  } catch (error) {
    console.error('Leaderboard API error:', error);
    
    let errorMessage = 'Failed to fetch leaderboard';
    if (error.response?.data) {
      errorMessage = error.response.data.message || 
                    error.response.data.error || 
                    error.response.data.errorMessage ||
                    JSON.stringify(error.response.data);
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: errorMessage,
      status: error.response?.status,
      details: error.response?.data
    });
  }
});

// ============ Nametag Prefix Routes ============
// GET - Read nametag prefix data
app.get('/api/nametag/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    const usernameParam = username;
    // Convert username to userId
    const userId = await getUserIdFromUsername(username);
    const key = getNametagPrefixKey(userId);
    
    const response = await axios.get(getV1EntryUrl(), {
      headers: getHeaders(),
      params: buildNametagPrefixEntryParams(key),
      responseType: 'text',
      validateStatus: (status) => status < 500,
    });
    
    if (response.status === 404) {
      return res.status(404).json({
        success: false,
        error: `Nametag prefix data not found for "${usernameParam}". The player may not have any nametag prefix stored yet.`
      });
    }
    
    if (response.status >= 400 && response.status < 500) {
      return res.status(response.status).json({
        success: false,
        error: `Roblox API error: ${response.statusText || 'Bad Request'}`,
        details: typeof response.data === 'string' ? response.data : 'Unknown error'
      });
    }
    
    let data = response.data;
    try {
      if (typeof data === 'string' && data.trim()) {
        data = JSON.parse(data);
      } else if (typeof data === 'string' && data.trim() === '') {
        return res.status(404).json({
          success: false,
          error: `Nametag prefix data not found for "${usernameParam}". The player may not have any nametag prefix stored yet.`
        });
      }
    } catch (parseError) {
      // leave as raw text if not JSON
    }
    
    if (data === undefined || data === null) {
      return res.status(404).json({
        success: false,
        error: `Nametag prefix data not found for "${usernameParam}". The player may not have any nametag prefix stored yet.`
      });
    }
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    // Check if error is from username conversion
    if (error.message && (error.message.includes('not found') || error.message.includes('convert username'))) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: `Nametag prefix data not found for "${req.params.username}". The player may not have any nametag prefix stored yet.`
      });
    }
    
    // Extract error message from various possible response formats
    let errorMessage = 'Failed to read nametag prefix data';
    if (error.response?.data) {
      errorMessage = error.response.data.message || 
                    error.response.data.error || 
                    error.response.data.errorMessage ||
                    JSON.stringify(error.response.data);
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: errorMessage,
      status: error.response?.status,
      details: error.response?.data
    });
  }
});

// POST - Create/Update nametag prefix data
app.post('/api/nametag/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    const { data } = req.body;
    // Convert username to userId
    const userId = await getUserIdFromUsername(username);
    const key = getNametagPrefixKey(userId);
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required'
      });
    }

    // Validate data format
    if (!data.color || !data.text) {
      return res.status(400).json({
        success: false,
        error: 'Data must contain "color" (with r, g, b) and "text" fields'
      });
    }

    if (data.color.r === undefined || data.color.g === undefined || data.color.b === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Color must contain r, g, and b values'
      });
    }
    
    const params = buildNametagPrefixEntryParams(key);
    const response = await axios.post(getV1EntryUrl(), data, {
      headers: getHeaders(),
      params: params,
    });
    
    res.json({
      success: true,
      data: response.data || {},
      message: 'Nametag prefix data saved successfully'
    });
  } catch (error) {
    // Check if error is from username conversion
    if (error.message && (error.message.includes('not found') || error.message.includes('convert username'))) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    // Extract error message from various possible response formats
    let errorMessage = 'Failed to create/update nametag prefix data';
    if (error.response?.data) {
      errorMessage = error.response.data.message || 
                    error.response.data.error || 
                    error.response.data.errorMessage ||
                    JSON.stringify(error.response.data);
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: errorMessage,
      status: error.response?.status,
      details: error.response?.data
    });
  }
});

// PUT - Update nametag prefix data
app.put('/api/nametag/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    const { data } = req.body;
    // Convert username to userId
    const userId = await getUserIdFromUsername(username);
    const key = getNametagPrefixKey(userId);
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required'
      });
    }

    // Validate data format
    if (!data.color || !data.text) {
      return res.status(400).json({
        success: false,
        error: 'Data must contain "color" (with r, g, b) and "text" fields'
      });
    }

    if (data.color.r === undefined || data.color.g === undefined || data.color.b === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Color must contain r, g, and b values'
      });
    }
    
    const params = buildNametagPrefixEntryParams(key);
    const response = await axios.post(getV1EntryUrl(), data, {
      headers: getHeaders(),
      params: params,
    });
    
    res.json({
      success: true,
      data: response.data || {},
      message: 'Nametag prefix data updated successfully'
    });
  } catch (error) {
    // Check if error is from username conversion
    if (error.message && (error.message.includes('not found') || error.message.includes('convert username'))) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    // Extract error message from various possible response formats
    let errorMessage = 'Failed to update nametag prefix data';
    if (error.response?.data) {
      const errors = error.response.data.errors || [];
      if (errors.length > 0 && errors[0].message) {
        errorMessage = errors[0].message;
      } else {
        errorMessage = error.response.data.message || 
                      error.response.data.error || 
                      error.response.data.errorMessage ||
                      JSON.stringify(error.response.data);
      }
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: errorMessage,
      status: error.response?.status,
      details: error.response?.data
    });
  }
});

// DELETE - Delete nametag prefix data
app.delete('/api/nametag/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    // Convert username to userId
    const userId = await getUserIdFromUsername(username);
    const key = getNametagPrefixKey(userId);
    
    const params = buildNametagPrefixEntryParams(key);
    await axios.delete(getV1EntryUrl(), {
      headers: getHeaders(),
      params: params,
    });
    
    res.json({
      success: true,
      message: 'Nametag prefix data deleted successfully'
    });
  } catch (error) {
    // Check if error is from username conversion
    if (error.message && (error.message.includes('not found') || error.message.includes('convert username'))) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Nametag prefix data not found'
      });
    }
    
    // Extract error message from various possible response formats
    let errorMessage = 'Failed to delete nametag prefix data';
    if (error.response?.data) {
      errorMessage = error.response.data.message || 
                    error.response.data.error || 
                    error.response.data.errorMessage ||
                    JSON.stringify(error.response.data);
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: errorMessage,
      status: error.response?.status,
      details: error.response?.data
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    config: {
      universeId: UNIVERSE_ID,
      datastoreName: DATASTORE_NAME,
      apiKeyConfigured: !!ROBLOX_API_KEY,
      apiKeyLength: ROBLOX_API_KEY ? ROBLOX_API_KEY.length : 0
    }
  });
});

// Test endpoint to verify API key and configuration
app.get('/api/test', async (req, res) => {
  try {
    // Test with a simple list operation to verify API key works
    const testUrl = `${getV1ListUrl()}?limit=1`;
    
    const config = {
      headers: getHeaders(),
      validateStatus: () => true // Don't throw on any status
    };
    
    console.log('\n=== API Key Test ===');
    console.log('Test URL:', testUrl);
    console.log('Method: GET');
    console.log('Universe ID:', UNIVERSE_ID);
    console.log('DataStore Name:', DATASTORE_NAME);
    console.log('API Key Present:', ROBLOX_API_KEY ? 'YES' : 'NO');
    console.log('API Key Length:', ROBLOX_API_KEY ? ROBLOX_API_KEY.length : 0);
    console.log('API Key First 10 chars:', ROBLOX_API_KEY ? ROBLOX_API_KEY.substring(0, 10) + '...' : 'N/A');
    console.log('API Key Last 10 chars:', ROBLOX_API_KEY ? '...' + ROBLOX_API_KEY.substring(ROBLOX_API_KEY.length - 10) : 'N/A');
    console.log('Headers:', JSON.stringify({ ...config.headers, 'x-api-key': '***HIDDEN***' }, null, 2));
    
    const response = await axios.get(testUrl, config);
    
    console.log('\n=== Response ===');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    
    res.json({
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      config: {
        url: testUrl,
        universeId: UNIVERSE_ID,
        datastoreName: DATASTORE_NAME,
        apiKeyConfigured: !!ROBLOX_API_KEY,
        apiKeyLength: ROBLOX_API_KEY ? ROBLOX_API_KEY.length : 0
      },
      message: response.status >= 200 && response.status < 300 
        ? 'API key test successful!' 
        : `API key test failed with status ${response.status}. Check the error details above.`
    });
  } catch (error) {
    console.error('\n=== Test Error ===');
    console.error('Error Message:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Status Text:', error.response.statusText);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response Headers:', JSON.stringify(error.response.headers, null, 2));
    }
    if (error.config) {
      console.error('Request URL:', error.config.url);
      console.error('Request Method:', error.config.method);
    }
    
    res.json({
      success: false,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        universeId: UNIVERSE_ID,
        datastoreName: DATASTORE_NAME,
        apiKeyConfigured: !!ROBLOX_API_KEY,
        apiKeyLength: ROBLOX_API_KEY ? ROBLOX_API_KEY.length : 0
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Make sure ROBLOX_API_KEY and UNIVERSE_ID are set in .env file`);
});

