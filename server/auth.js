// Authentication middleware and utilities
const ADMIN_USERNAME = process.env.ADMIN_USERNAME?.trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim();

// Simple authentication check
const authenticate = (req, res, next) => {
  // Check if user is authenticated (has session)
  if (req.session && req.session.authenticated) {
    return next();
  }
  
  // If not authenticated, return 401
  return res.status(401).json({
    success: false,
    error: 'Unauthorized - Please login',
    requiresAuth: true
  });
};

// Login handler
const handleLogin = (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }
  
  // Check credentials against .env
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // Set session
    req.session.authenticated = true;
    req.session.username = username;
    
    return res.json({
      success: true,
      message: 'Login successful',
      username: username
    });
  } else {
    return res.status(401).json({
      success: false,
      error: 'Invalid username or password'
    });
  }
};

// Logout handler
const handleLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Failed to logout'
      });
    }
    
    res.clearCookie('connect.sid'); // Clear session cookie
    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
};

// Check auth status
const checkAuth = (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.json({
      success: true,
      authenticated: true,
      username: req.session.username
    });
  } else {
    return res.json({
      success: true,
      authenticated: false
    });
  }
};

module.exports = {
  authenticate,
  handleLogin,
  handleLogout,
  checkAuth,
  ADMIN_USERNAME,
  ADMIN_PASSWORD
};

