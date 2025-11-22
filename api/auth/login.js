const crypto = require('crypto');
const { corsHeaders } = require('../utils');

// Admin credentials from environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME?.trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim();
const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret-change-in-production';

// Generate a simple token (for serverless, we'll use a signed token)
function generateToken(username) {
  const payload = {
    username,
    timestamp: Date.now(),
  };
  
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return Buffer.from(JSON.stringify({ ...payload, signature })).toString('base64');
}

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

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Check credentials
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = generateToken(username);
      
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        username: username,
        token: token // Client should store this token
      });
    } else {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

