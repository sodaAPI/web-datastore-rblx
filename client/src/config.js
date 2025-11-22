// API Configuration
// In production (Vercel), use relative paths. In development, use localhost
export const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

