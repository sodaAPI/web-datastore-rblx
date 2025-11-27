const axios = require('axios');
const {
  getV1ListUrl,
  getHeaders,
  UNIVERSE_ID,
  DATASTORE_NAME,
  ROBLOX_API_KEY,
  corsHeaders,
} = require('./utils');

module.exports = async (req, res) => {
  // Set CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });

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
    console.log('Environment:', process.env.NODE_ENV || 'not set');
    console.log('Vercel:', process.env.VERCEL ? 'YES' : 'NO');
    
    const response = await axios.get(testUrl, config);
    
    console.log('\n=== Response ===');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    
    return res.status(200).json({
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      config: {
        url: testUrl,
        universeId: UNIVERSE_ID,
        datastoreName: DATASTORE_NAME,
        apiKeyConfigured: !!ROBLOX_API_KEY,
        apiKeyLength: ROBLOX_API_KEY ? ROBLOX_API_KEY.length : 0,
        environment: process.env.NODE_ENV || 'not set',
        isVercel: !!process.env.VERCEL
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
    }
    
    return res.status(200).json({
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
        apiKeyLength: ROBLOX_API_KEY ? ROBLOX_API_KEY.length : 0,
        environment: process.env.NODE_ENV || 'not set',
        isVercel: !!process.env.VERCEL
      }
    });
  }
};

