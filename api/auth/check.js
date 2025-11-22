const crypto = require('crypto');
const { corsHeaders } = require('../utils');

const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret-change-in-production';

// Verify token
function verifyToken(token) {
  try {
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

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.'
    });
  }

  try {
    // Get token from Authorization header or query parameter
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7)
      : req.query.token;

    if (!token) {
      return res.status(200).json({
        success: true,
        authenticated: false
      });
    }

    const decoded = verifyToken(token);
    
    if (decoded) {
      return res.status(200).json({
        success: true,
        authenticated: true,
        username: decoded.username
      });
    } else {
      return res.status(200).json({
        success: true,
        authenticated: false
      });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return res.status(200).json({
      success: true,
      authenticated: false
    });
  }
};

