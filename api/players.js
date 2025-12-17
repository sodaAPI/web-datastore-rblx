const axios = require('axios');
const {
  getV1ListUrl,
  getHeaders,
  getUsernamesFromUserIds,
  corsHeaders,
  authenticate,
  DATASTORE_NAME,
  SCOPE,
} = require('./utils');

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
    const { cursor, limit = 100 } = req.query;
    // Cap limit at 100 for performance with large datasets
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
    
    return res.status(200).json({
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
      
      console.error('\n=== API Error Details ===');
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Request Error:', error.message);
    }
    
    return res.status(error.response?.status || 500).json({
      success: false,
      error: errorMessage,
      status: error.response?.status,
      details: error.response?.data
    });
  }
};

