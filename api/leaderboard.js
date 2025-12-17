const axios = require('axios');
const {
  getV1EntryUrl,
  getV1ListUrl,
  getHeaders,
  buildEntryParams,
  getUserIdFromUsername,
  getPlayerKey,
  getUsernamesFromUserIds,
  corsHeaders,
  authenticate,
  DATASTORE_NAME,
  SCOPE,
} = require('./utils');

// Leaderboard datastore configuration
const LEADERBOARD_DATASTORE_NAME = 'LeaderboardCache';
const LEADERBOARD_KEY = 'top_summits';

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

// Helper to build entry params for leaderboard datastore
const buildLeaderboardEntryParams = (key) => ({
  datastoreName: LEADERBOARD_DATASTORE_NAME,
  scope: SCOPE,
  entryKey: key,
});

// Function to load leaderboard from persistent datastore
const loadLeaderboardFromDatastore = async () => {
  try {
    const entryParams = buildLeaderboardEntryParams(LEADERBOARD_KEY);
    const response = await axios.get(getV1EntryUrl(), {
      headers: getHeaders(),
      params: entryParams,
      validateStatus: (status) => status < 500,
    });

    if (response.status === 404) {
      return null; // No cached leaderboard
    }

    let data = response.data;
    if (typeof data === 'string' && data.trim()) {
      data = JSON.parse(data);
    }

    // Check if cache is still valid (10 minutes TTL)
    const cacheAge = Date.now() - (data.timestamp || 0);
    const ttl = 10 * 60 * 1000; // 10 minutes
    
    if (cacheAge > ttl) {
      return null; // Cache expired
    }

    return data;
  } catch (error) {
    console.error('Error loading leaderboard from datastore:', error.message);
    return null;
  }
};

// Function to save leaderboard to persistent datastore
const saveLeaderboardToDatastore = async (leaderboardData) => {
  try {
    const entryParams = buildLeaderboardEntryParams(LEADERBOARD_KEY);
    const dataToSave = {
      ...leaderboardData,
      timestamp: Date.now(),
    };

    await makeRateLimitedRequest(async () => {
      return await axios.post(getV1EntryUrl(), dataToSave, {
        headers: getHeaders(),
        params: entryParams,
      });
    });

    console.log('Leaderboard saved to datastore');
  } catch (error) {
    console.error('Error saving leaderboard to datastore:', error.message);
    // Don't throw - this is not critical
  }
};

// Helper function to sample players from a specific range
const samplePlayersFromRange = async (cursor, maxPlayers, description) => {
  console.log(`Sampling ${maxPlayers} players ${description}...`);
  let candidates = [];
  let currentCursor = cursor;
  let pagesFetched = 0;
  const maxPages = Math.ceil(maxPlayers / 100);

  while (pagesFetched < maxPages && candidates.length < maxPlayers) {
    const params = {
      datastoreName: DATASTORE_NAME,
      scope: SCOPE,
      limit: 100,
      cursor: currentCursor,
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
    for (let i = 0; i < userIds.length && candidates.length < maxPlayers; i += batchSize) {
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
            candidates.push({
              userId,
              summit: summitValue,
              data
            });
          }
        } catch (error) {
          if (error.response?.status === 429) {
            console.error('Rate limit exceeded. Stopping sampling.');
            return { candidates, cursor: currentCursor, stopped: true };
          }
          console.error(`Error fetching data for userId ${userId}:`, error.message);
        }
        
        await delay(200);
      }

      if (i + batchSize < userIds.length) {
        await delay(500);
      }
    }

    currentCursor = listResponse.data?.nextPageCursor || null;
    pagesFetched++;

    if (!currentCursor) break;
    await delay(1000);
  }

  return { candidates, cursor: currentCursor, stopped: false };
};

// Function to fetch and process leaderboard (the expensive operation)
// For 1M+ players, we use distributed sampling to get better coverage
const fetchLeaderboardData = async (topLimit, maxSample) => {
  console.log(`Fetching leaderboard: top ${topLimit}, sampling ${maxSample} players from 1M+ dataset`);

  let allCandidates = [];
  
  // Strategy: Sample from beginning of dataset
  // For 1M players, sampling from the beginning should still find top players
  // since high-scoring players are likely to be active and appear early
  const result1 = await samplePlayersFromRange(null, maxSample, 'from beginning of dataset');
  allCandidates.push(...result1.candidates);
  
  if (result1.stopped) {
    console.log('Stopped early due to rate limits');
  } else if (allCandidates.length < maxSample && result1.cursor) {
    // Continue sampling if we haven't hit the limit
    const remaining = maxSample - allCandidates.length;
    const result2 = await samplePlayersFromRange(result1.cursor, remaining, 'continuing from dataset');
    allCandidates.push(...result2.candidates);
  }

    // Sort by summit value (descending) and get top N
    const sorted = allCandidates
      .sort((a, b) => b.summit - a.summit)
      .slice(0, topLimit);

  // Convert userIds to usernames for top players only
  const userIdsToConvert = sorted.map(p => p.userId);
  const usernames = await getUsernamesFromUserIds(userIdsToConvert);

  // Combine with usernames
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
    timestamp: Date.now(),
    samplingStrategy: 'distributed', // Mark that we used distributed sampling
  };
};

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({}).end();
  }

  // Set CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  // Check authentication
  const auth = authenticate(req);
  if (!auth.authenticated) {
    return res.status(401).json({
      success: false,
      error: auth.error,
      requiresAuth: true
    });
  }

  try {
    const { limit = 10, sampleSize = 200, forceRefresh = false } = req.query;
    const topLimit = Math.min(parseInt(limit) || 10, 50); // Cap at 50
    const maxSample = Math.min(parseInt(sampleSize) || 200, 10000); // Increased default to 2000, cap at 10000
    const shouldForceRefresh = forceRefresh === 'true' || forceRefresh === true;

    // Check persistent datastore cache first (unless force refresh is requested)
    if (!shouldForceRefresh) {
      const cachedData = await loadLeaderboardFromDatastore();
      
      if (cachedData) {
        console.log('Serving leaderboard from persistent datastore cache');
        const limitedLeaderboard = cachedData.leaderboard.slice(0, topLimit);
        
        return res.status(200).json({
          success: true,
          data: {
            leaderboard: limitedLeaderboard,
            sampleSize: cachedData.sampleSize,
            totalSampled: cachedData.totalSampled,
            cached: true,
            cacheAge: Math.round((Date.now() - cachedData.timestamp) / 1000), // Age in seconds
            note: `Leaderboard from cache (${cachedData.sampleSize} players sampled from 1M+ dataset). Add ?forceRefresh=true to refresh.`
          }
        });
      }
    }

    // Cache miss or force refresh - fetch fresh data
    console.log(shouldForceRefresh ? 'Force refreshing leaderboard...' : 'Cache expired, fetching fresh leaderboard from 1M+ players...');
    
    const leaderboardData = await fetchLeaderboardData(topLimit, maxSample);

    // Save to persistent datastore (async, don't wait)
    saveLeaderboardToDatastore(leaderboardData).catch(err => {
      console.error('Failed to save leaderboard to datastore:', err.message);
    });

    return res.status(200).json({
      success: true,
      data: {
        leaderboard: leaderboardData.leaderboard,
        sampleSize: leaderboardData.sampleSize,
        totalSampled: leaderboardData.totalSampled,
        cached: false,
        note: `Leaderboard based on sample of ${leaderboardData.sampleSize} players from ${leaderboardData.pagesFetched} pages. Cached for 10 minutes.`
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

    return res.status(error.response?.status || 500).json({
      success: false,
      error: errorMessage,
      status: error.response?.status,
      details: error.response?.data
    });
  }
};

