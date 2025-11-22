const { corsHeaders } = require('../utils');

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    Object.keys(corsHeaders).forEach(key => {
      res.setHeader(key, corsHeaders[key]);
    });
    return res.status(200).json({}).end();
  }

  // Set CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  // For serverless, logout is handled client-side by removing the token
  // This endpoint just confirms the logout
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

