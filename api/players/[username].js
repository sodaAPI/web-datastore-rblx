const axios = require('axios');
const {
  getV1EntryUrl,
  buildEntryParams,
  getHeaders,
  writeEntry,
  getUserIdFromUsername,
  getPlayerKey,
  corsHeaders,
  authenticate,
} = require('../utils');

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({}).end();
  }

  // Set CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });

  // Check authentication for write/delete operations
  if (req.method !== 'GET') {
    const auth = authenticate(req);
    if (!auth.authenticated) {
      return res.status(401).json({
        success: false,
        error: auth.error,
        requiresAuth: true
      });
    }
  }

  // Extract username from URL path (Vercel dynamic route)
  // The file is at /api/players/[username].js, so the param is in the URL
  // Try multiple methods to get the username parameter
  let username = req.query.username;
  
  // If not in query, parse from URL path
  if (!username && req.url) {
    const urlMatch = req.url.match(/\/api\/players\/([^/?]+)/);
    if (urlMatch) {
      username = decodeURIComponent(urlMatch[1]);
    }
  }
  
  if (!username) {
    return res.status(400).json({
      success: false,
      error: 'Username parameter is required'
    });
  }
  
  const method = req.method;

  try {
    // Convert username to userId
    const userId = await getUserIdFromUsername(username);
    const key = getPlayerKey(userId);

    if (method === 'GET') {
      // GET - Read player data
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
      
      return res.status(200).json({
        success: true,
        data,
      });
    }

    if (method === 'POST' || method === 'PUT') {
      // POST/PUT - Create/Update player data
      const { data } = req.body;
      
      if (!data) {
        return res.status(400).json({
          success: false,
          error: 'Data is required'
        });
      }
      
      const response = await writeEntry(key, data);
      
      return res.status(200).json({
        success: true,
        data: response.data || {},
        message: method === 'POST' ? 'Player data saved successfully' : 'Player data updated successfully'
      });
    }

    if (method === 'DELETE') {
      // DELETE - Delete player data
      await axios.delete(getV1EntryUrl(), {
        headers: getHeaders(),
        params: buildEntryParams(key),
      });
      
      return res.status(200).json({
        success: true,
        message: 'Player data deleted successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
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
    let errorMessage = `Failed to ${method === 'GET' ? 'read' : method === 'DELETE' ? 'delete' : 'update'} player data`;
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

