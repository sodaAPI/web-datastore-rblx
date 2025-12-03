const axios = require('axios');
const {
  getV1EntryUrl,
  buildNametagPrefixEntryParams,
  getHeaders,
  writeEntry,
  getUserIdFromUsername,
  getNametagPrefixKey,
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
  let username = req.query.username;
  
  // Also check if it's in the path directly (some Vercel setups)
  if (!username && req.url) {
    const urlMatch = req.url.match(/\/api\/nametag\/([^/?]+)/);
    if (urlMatch) {
      username = decodeURIComponent(urlMatch[1]);
    }
  }
  
  // Log for debugging
  console.log('Nametag request details:', {
    method: req.method,
    url: req.url,
    query: req.query,
    extractedUsername: username,
    hasApiKey: !!process.env.ROBLOX_API_KEY,
    hasUniverseId: !!process.env.UNIVERSE_ID
  });
  
  if (!username) {
    return res.status(400).json({
      success: false,
      error: 'Username parameter is required',
      debug: {
        url: req.url,
        query: req.query
      }
    });
  }
  
  const method = req.method;

  try {
    // Convert username to userId
    const userId = await getUserIdFromUsername(username);
    const key = getNametagPrefixKey(userId);

    if (method === 'GET') {
      // GET - Read nametag prefix data
      try {
        // Validate environment variables before making the API call
        if (!process.env.ROBLOX_API_KEY || !process.env.UNIVERSE_ID) {
          console.error('Missing environment variables:', {
            hasApiKey: !!process.env.ROBLOX_API_KEY,
            hasUniverseId: !!process.env.UNIVERSE_ID
          });
          return res.status(500).json({
            success: false,
            error: 'Server configuration error: Missing ROBLOX_API_KEY or UNIVERSE_ID environment variables'
          });
        }

        const entryUrl = getV1EntryUrl();
        const params = buildNametagPrefixEntryParams(key);
        const headers = getHeaders();
        
        console.log('Making Roblox API request for nametag:', {
          url: entryUrl,
          params: { ...params, entryKey: params.entryKey.substring(0, 20) + '...' }, // Log partial key for security
          hasApiKey: !!headers['x-api-key']
        });
        
        const response = await axios.get(entryUrl, {
          headers: headers,
          params: params,
          responseType: 'text',
          validateStatus: (status) => status < 500, // Don't throw on 4xx, we'll handle it
        });
        
        console.log('Roblox API response for nametag:', {
          status: response.status,
          statusText: response.statusText,
          dataLength: response.data?.length || 0,
          dataPreview: typeof response.data === 'string' ? response.data.substring(0, 100) : response.data
        });
        
        // Check if Roblox API returned an error status
        if (response.status === 404) {
          return res.status(404).json({
            success: false,
            error: `Nametag prefix data not found for "${username}". The player may not have any nametag prefix stored yet.`
          });
        }
        
        // Check for other error statuses
        if (response.status >= 400 && response.status < 500) {
          console.error('Roblox API returned error status:', response.status, response.data);
          return res.status(response.status).json({
            success: false,
            error: `Roblox API error: ${response.statusText || 'Bad Request'}`,
            details: typeof response.data === 'string' ? response.data : 'Unknown error'
          });
        }
        
        let data = response.data;
        
        // Log the raw response for debugging
        console.log('Raw response data type:', typeof data);
        console.log('Raw response data value:', data === null ? 'null' : data === undefined ? 'undefined' : data === '' ? 'empty string' : String(data).substring(0, 200));
        
        // Try to parse as JSON first
        let parsedData = data;
        try {
          if (typeof data === 'string' && data.trim()) {
            parsedData = JSON.parse(data);
            console.log('Successfully parsed as JSON');
          } else if (typeof data === 'string' && data.trim() === '') {
            // Empty string - this means no data exists
            console.log('Empty string response - no data exists');
            return res.status(404).json({
              success: false,
              error: `Nametag prefix data not found for "${username}". The player may not have any nametag prefix stored yet.`
            });
          }
        } catch (parseError) {
          // leave as raw text if not JSON
          console.log('Data is not JSON, keeping as text. Parse error:', parseError.message);
        }
        
        // Handle undefined/null (but allow empty objects as valid data)
        if (parsedData === undefined || parsedData === null) {
          console.log('Parsed data is undefined/null - no data exists');
          return res.status(404).json({
            success: false,
            error: `Nametag prefix data not found for "${username}". The player may not have any nametag prefix stored yet.`
          });
        }
        
        // Return the data as-is
        console.log('Returning nametag data successfully');
        return res.status(200).json({
          success: true,
          data: parsedData,
        });
      } catch (error) {
        // Handle 404 from Roblox API
        if (error.response?.status === 404) {
          return res.status(404).json({
            success: false,
            error: 'Nametag prefix data not found'
          });
        }
        
        // Log the full error for debugging
        console.error('Error in GET request for nametag:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            params: error.config?.params
          }
        });
        
        throw error; // Re-throw to be handled by outer catch
      }
    }

    if (method === 'POST' || method === 'PUT') {
      // POST/PUT - Create/Update nametag prefix data
      const { data } = req.body;
      
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
      
      // Use custom params for nametag datastore
      const params = buildNametagPrefixEntryParams(key);
      const headers = getHeaders();
      
      const response = await axios.post(getV1EntryUrl(), data, {
        headers: headers,
        params: params,
      });
      
      return res.status(200).json({
        success: true,
        data: response.data || {},
        message: method === 'POST' ? 'Nametag prefix data saved successfully' : 'Nametag prefix data updated successfully'
      });
    }

    if (method === 'DELETE') {
      // DELETE - Delete nametag prefix data
      const params = buildNametagPrefixEntryParams(key);
      const headers = getHeaders();
      
      await axios.delete(getV1EntryUrl(), {
        headers: headers,
        params: params,
      });
      
      return res.status(200).json({
        success: true,
        message: 'Nametag prefix data deleted successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  } catch (error) {
    // Log error for debugging
    console.error('Error in nametag/[username] endpoint:', {
      method: req.method,
      username: username,
      errorMessage: error.message,
      errorStatus: error.response?.status,
      errorData: error.response?.data
    });
    
    // Check if error is from username conversion
    if (error.message && (error.message.includes('not found') || error.message.includes('convert username'))) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    // Handle Roblox API 404 (entry doesn't exist)
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: `Nametag prefix data not found for "${username}". The player may not have any nametag prefix stored yet.`
      });
    }
    
    // Handle other Roblox API errors
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      let errorMessage = `Failed to ${method === 'GET' ? 'read' : method === 'DELETE' ? 'delete' : 'update'} nametag prefix data`;
      
      if (errorData) {
        if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          errorMessage = errorData.errors[0].message || errorMessage;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      }
      
      return res.status(status).json({
        success: false,
        error: errorMessage,
        status: status
      });
    }
    
    // Extract error message from various possible response formats
    let errorMessage = `Failed to ${method === 'GET' ? 'read' : method === 'DELETE' ? 'delete' : 'update'} nametag prefix data`;
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

