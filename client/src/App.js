import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import { API_BASE_URL } from './config';
import Login from './Login';

// Modern SVG Icons
const IconRead = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const IconAdd = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const IconList = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

const IconInfo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const IconColorPicker = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
    <circle cx="12" cy="12" r="1"></circle>
  </svg>
);

// Configure axios to send auth token with all requests (for Vercel)
// Also enable credentials for session-based auth (local dev)
const getAuthToken = () => localStorage.getItem('authToken');

// Add token to all requests and enable credentials for sessions
axios.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Always enable credentials to support session cookies (local dev)
    config.withCredentials = true;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [username, setUsername] = useState('');
  const [playerData, setPlayerData] = useState(null);
  const [dataJson, setDataJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [playersList, setPlayersList] = useState([]);
  const [listCursor, setListCursor] = useState(null);
  const [showList, setShowList] = useState(false);
  
  // Nametag prefix state
  const [nametagUsername, setNametagUsername] = useState('');
  const [nametagData, setNametagData] = useState(null);
  const [nametagColor, setNametagColor] = useState({ r: 255, g: 0, b: 0 });
  const [nametagText, setNametagText] = useState('');
  const [nametagLoading, setNametagLoading] = useState(false);
  const colorPickerRef = useRef(null);

  // Helper function to convert RGB to hex
  const rgbToHex = (r, g, b) => {
    const toHex = (n) => {
      const hex = parseInt(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Helper function to convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Handle color picker click
  const handleColorPreviewClick = () => {
    if (colorPickerRef.current) {
      colorPickerRef.current.click();
    }
  };

  // Handle color picker change
  const handleColorPickerChange = (e) => {
    const hex = e.target.value;
    const rgb = hexToRgb(hex);
    if (rgb) {
      setNametagColor(rgb);
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      // Try to check auth status (works for both token and session-based)
      // withCredentials is already set globally in the axios interceptor
      const response = await axios.get(`${API_BASE_URL}/api/auth/check`);
      
      if (response.data.authenticated) {
        setAuthenticated(true);
        setAuthUsername(response.data.username || '');
      } else {
        setAuthenticated(false);
        // Only remove token if we're using token-based auth
        // For session-based, the session might just be expired
        const token = getAuthToken();
        if (token) {
          localStorage.removeItem('authToken');
        }
      }
    } catch (err) {
      // Auth check failed - user is not authenticated
      setAuthenticated(false);
      const token = getAuthToken();
      if (token) {
        localStorage.removeItem('authToken');
      }
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogin = (username) => {
    setAuthenticated(true);
    setAuthUsername(username);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/logout`);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('authToken');
      setAuthenticated(false);
      setAuthUsername('');
    }
  };

  // Handle 401 errors (unauthorized) by logging out
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && error.response?.data?.requiresAuth) {
          localStorage.removeItem('authToken');
          setAuthenticated(false);
          setAuthUsername('');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleRead = async () => {
    if (!username.trim()) {
      setError('Please enter a Username');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setPlayerData(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/players/${username}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        validateStatus: (status) => status >= 200 && status < 400 // Accept 2xx and 3xx
      });
      
      // Handle 304 Not Modified - might not have response body
      if (response.status === 304) {
        setError('Data not modified (cached). Please try again.');
        setLoading(false);
        return;
      }
      
      // Check if response indicates failure
      if (response.data && response.data.success === false) {
        setError(response.data.error || 'Player data not found');
        setPlayerData(null);
        setDataJson('');
        return;
      }
      
      // Handle different response structures
      if (!response.data) {
        setError('No data received from server');
        setPlayerData(null);
        setDataJson('');
        return;
      }
      
      const fullData = response.data?.data;
      
      // Only reject if data is truly missing (undefined, null, or empty string)
      // Empty objects {} are valid data and should be accepted
      const isMissing = 
        fullData === undefined || 
        fullData === null || 
        fullData === '' ||
        (typeof fullData === 'string' && fullData.trim() === '');
      
      if (isMissing) {
        setError(`Player "${username}" has no data stored in the DataStore. Use "Create/Update" to add data.`);
        setPlayerData(null);
        setDataJson('{}'); // Set empty JSON object for user to edit
        return;
      }
      
      setPlayerData(fullData);
      
      // Extract just the value for editing (Roblox API returns full entry with metadata)
      // The data might be the value directly, or it might be wrapped in a 'value' property
      let valueData = fullData;
      if (fullData && typeof fullData === 'object' && fullData !== null && 'value' in fullData) {
        valueData = fullData.value;
      }
      
      // Ensure valueData is not undefined before stringifying
      if (valueData === undefined || valueData === null) {
        valueData = {};
      }
      
      setDataJson(JSON.stringify(valueData, null, 2));
      setSuccess('Player data retrieved successfully!');
    } catch (err) {
      console.error('Read error:', err);
      console.error('Error response:', err.response);
      
      // Extract error message with more details for debugging
      let errorMessage = 'Failed to read player data';
      
      if (err.response) {
        // Server responded with an error
        errorMessage = err.response.data?.error || 
                      err.response.data?.message || 
                      `Server error (${err.response.status})`;
        
        // Add debug info in development
        if (process.env.NODE_ENV !== 'production') {
          console.error('Full error response:', {
            status: err.response.status,
            statusText: err.response.statusText,
            data: err.response.data
          });
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your connection.';
        console.error('No response received:', err.request);
      } else {
        // Error setting up the request
        errorMessage = err.message || 'Failed to read player data';
      }
      
      setError(errorMessage);
      setPlayerData(null);
      setDataJson('');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!username.trim()) {
      setError('Please enter a Username');
      return;
    }

    let data;
    try {
      data = JSON.parse(dataJson || '{}');
    } catch (err) {
      setError('Invalid JSON format');
      return;
    }

    // Ensure we're only sending the value, not metadata
    // If data has a 'value' field, extract it; otherwise use data as-is
    const valueToSend = data.value !== undefined ? data.value : data;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API_BASE_URL}/api/players/${username}`, { data: valueToSend });
      setSuccess('Player data created/updated successfully!');
      handleRead(); // Refresh the data
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create/update player data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!username.trim()) {
      setError('Please enter a Username');
      return;
    }

    let data;
    try {
      data = JSON.parse(dataJson || '{}');
    } catch (err) {
      setError('Invalid JSON format');
      return;
    }

    // Ensure we're only sending the value, not metadata
    // If data has a 'value' field, extract it; otherwise use data as-is
    const valueToSend = data.value !== undefined ? data.value : data;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.put(`${API_BASE_URL}/api/players/${username}`, { data: valueToSend });
      setSuccess(response.data?.message || 'Player data updated successfully!');
      handleRead(); // Refresh the data
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to update player data';
      const suggestion = err.response?.data?.suggestion;
      setError(suggestion ? `${errorMsg}. ${suggestion}` : errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!username.trim()) {
      setError('Please enter a Username');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete data for player ${username}?`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.delete(`${API_BASE_URL}/api/players/${username}`);
      setSuccess('Player data deleted successfully!');
      setPlayerData(null);
      setDataJson('');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to delete player data');
    } finally {
      setLoading(false);
    }
  };

  const handleListPlayers = async (cursor = null) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const params = cursor ? { cursor } : {};
      const response = await axios.get(`${API_BASE_URL}/api/players`, { params });
      // Keys are now usernames (converted from userIds on server)
      const usernames = response.data.data?.keys || response.data.data?.dataStoreEntries?.map(e => e.id) || [];
      setPlayersList(usernames);
      setListCursor(response.data.data?.nextPageToken || response.data.data?.nextPageCursor || null);
      setShowList(true);
      setSuccess('Players list retrieved successfully!');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to list players');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlayer = (username) => {
    // The key is now a username, so we can use it directly
    setUsername(username);
    setShowList(false);
    handleRead();
  };

  // Nametag prefix handlers
  const handleReadNametag = async () => {
    if (!nametagUsername.trim()) {
      setError('Please enter a Username');
      return;
    }

    setNametagLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.get(`${API_BASE_URL}/api/nametag/${nametagUsername}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        validateStatus: (status) => status >= 200 && status < 400
      });
      
      if (response.status === 304) {
        setError('Data not modified (cached). Please try again.');
        setNametagLoading(false);
        return;
      }
      
      if (response.data && response.data.success === false) {
        setError(response.data.error || 'Nametag prefix data not found');
        setNametagData(null);
        setNametagColor({ r: 255, g: 0, b: 0 });
        setNametagText('');
        return;
      }
      
      const fullData = response.data?.data;
      
      if (!fullData || fullData === null || fullData === '') {
        setError(`Nametag prefix data not found for "${nametagUsername}". Use "Create/Update" to add data.`);
        setNametagData(null);
        setNametagColor({ r: 255, g: 0, b: 0 });
        setNametagText('');
        return;
      }
      
      setNametagData(fullData);
      
      // Extract color and text
      if (fullData.color) {
        setNametagColor({
          r: fullData.color.r || 255,
          g: fullData.color.g || 0,
          b: fullData.color.b || 0
        });
      }
      if (fullData.text) {
        setNametagText(fullData.text);
      }
      
      setSuccess('Nametag prefix data retrieved successfully!');
    } catch (err) {
      let errorMessage = 'Failed to read nametag prefix data';
      
      if (err.response) {
        errorMessage = err.response.data?.error || 
                      err.response.data?.message || 
                      `Server error (${err.response.status})`;
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = err.message || 'Failed to read nametag prefix data';
      }
      
      setError(errorMessage);
      setNametagData(null);
      setNametagColor({ r: 255, g: 0, b: 0 });
      setNametagText('');
    } finally {
      setNametagLoading(false);
    }
  };

  const handleCreateNametag = async () => {
    if (!nametagUsername.trim()) {
      setError('Please enter a Username');
      return;
    }

    if (!nametagText.trim()) {
      setError('Please enter nametag text');
      return;
    }

    const data = {
      color: {
        r: parseInt(nametagColor.r) || 255,
        g: parseInt(nametagColor.g) || 0,
        b: parseInt(nametagColor.b) || 0
      },
      text: nametagText.trim()
    };

    setNametagLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API_BASE_URL}/api/nametag/${nametagUsername}`, { data });
      setSuccess('Nametag prefix data created/updated successfully!');
      handleReadNametag(); // Refresh the data
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create/update nametag prefix data');
    } finally {
      setNametagLoading(false);
    }
  };

  const handleUpdateNametag = async () => {
    if (!nametagUsername.trim()) {
      setError('Please enter a Username');
      return;
    }

    if (!nametagText.trim()) {
      setError('Please enter nametag text');
      return;
    }

    const data = {
      color: {
        r: parseInt(nametagColor.r) || 255,
        g: parseInt(nametagColor.g) || 0,
        b: parseInt(nametagColor.b) || 0
      },
      text: nametagText.trim()
    };

    setNametagLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.put(`${API_BASE_URL}/api/nametag/${nametagUsername}`, { data });
      setSuccess(response.data?.message || 'Nametag prefix data updated successfully!');
      handleReadNametag(); // Refresh the data
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update nametag prefix data');
    } finally {
      setNametagLoading(false);
    }
  };

  const handleDeleteNametag = async () => {
    if (!nametagUsername.trim()) {
      setError('Please enter a Username');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete nametag prefix data for ${nametagUsername}?`)) {
      return;
    }

    setNametagLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.delete(`${API_BASE_URL}/api/nametag/${nametagUsername}`);
      setSuccess('Nametag prefix data deleted successfully!');
      setNametagData(null);
      setNametagColor({ r: 255, g: 0, b: 0 });
      setNametagText('');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to delete nametag prefix data');
    } finally {
      setNametagLoading(false);
    }
  };

  // Show login if not authenticated
  if (checkingAuth) {
    return (
      <div className="App">
        <div className="container">
          <div style={{ textAlign: 'center', padding: '50px', color: '#71717a' }}>
            <p>Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <h1>DataStore Manager</h1>
              <p className="subtitle">Manage PlayerData for experience</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.875rem', color: '#71717a' }}>Logged in as: <strong style={{ color: '#09090b' }}>{authUsername}</strong></span>
              <button 
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="main-content">
          <div className="card">
            <h2>Player Operations</h2>
            
            <div className="form-group">
              <label htmlFor="username">Username:</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (e.g., builderman)"
                className="input"
              />
            </div>

            <div className="button-group">
              <button 
                onClick={handleRead} 
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Loading...' : (
                  <>
                    <IconRead /> Read
                  </>
                )}
              </button>
              <button 
                onClick={handleCreate} 
                disabled={loading}
                className="btn btn-success"
              >
                {loading ? 'Saving...' : (
                  <>
                    <IconAdd /> Create/Update
                  </>
                )}
              </button>
              <button 
                onClick={handleUpdate} 
                disabled={loading}
                className="btn btn-warning"
              >
                {loading ? 'Updating...' : (
                  <>
                    <IconEdit /> Update
                  </>
                )}
              </button>
              <button 
                onClick={handleDelete} 
                disabled={loading}
                className="btn btn-danger"
              >
                {loading ? 'Deleting...' : (
                  <>
                    <IconTrash /> Delete
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="card">
            <h2>Player Data (JSON)</h2>
            <textarea
              value={dataJson}
              onChange={(e) => setDataJson(e.target.value)}
              placeholder='Enter JSON data (e.g., {"coins": 100, "level": 5})'
              className="textarea"
              rows="15"
            />
            <p className="help-text">
              <IconInfo /> Tip: Use "Read" to load existing data, or enter new JSON data to create/update
            </p>
          </div>

          <div className="card">
            <h2>List All Players</h2>
            <button 
              onClick={() => handleListPlayers()} 
              disabled={loading}
              className="btn btn-info"
            >
              {loading ? 'Loading...' : (
                <>
                  <IconList /> List Players
                </>
              )}
            </button>

            {showList && playersList.length > 0 && (
              <div className="players-list">
                <h3>Players ({playersList.length})</h3>
                <div className="players-grid">
                  {playersList.map((key, index) => (
                    <div 
                      key={index} 
                      className="player-item"
                      onClick={() => handleSelectPlayer(key)}
                    >
                      {key}
                    </div>
                  ))}
                </div>
                {listCursor && (
                  <button 
                    onClick={() => handleListPlayers(listCursor)} 
                    disabled={loading}
                    className="btn btn-secondary"
                  >
                    Load More
                  </button>
                )}
                <p className="help-text" style={{ marginTop: '10px', fontSize: '0.8125rem', color: '#71717a' }}>
                  <IconInfo /> Click on any player to load their data
                </p>
              </div>
            )}

            {showList && playersList.length === 0 && (
              <p className="no-data">No players found</p>
            )}
          </div>

          {playerData && (
            <div className="card">
              <h2>Current Player Data</h2>
              <pre className="data-preview">{JSON.stringify(playerData, null, 2)}</pre>
            </div>
          )}

          <div className="card" style={{ marginTop: '30px', borderTop: '1px solid rgba(0, 0, 0, 0.1)' }}>
            <h2>Nametag Prefix Operations</h2>
            <div className="form-group">
              <label htmlFor="nametag-username">Username:</label>
              <input
                id="nametag-username"
                type="text"
                value={nametagUsername}
                onChange={(e) => setNametagUsername(e.target.value)}
                placeholder="Enter username (e.g., builderman)"
                className="input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="nametag-text">Nametag Text:</label>
              <input
                id="nametag-text"
                type="text"
                value={nametagText}
                onChange={(e) => setNametagText(e.target.value)}
                placeholder="Enter nametag text (e.g., Owner)"
                className="input"
              />
            </div>

            <div className="form-group">
              <label>Color (RGB):</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8125rem', color: '#71717a' }}>Red (R):</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={nametagColor.r}
                    onChange={(e) => setNametagColor({ ...nametagColor, r: e.target.value })}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8125rem', color: '#71717a' }}>Green (G):</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={nametagColor.g}
                    onChange={(e) => setNametagColor({ ...nametagColor, g: e.target.value })}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8125rem', color: '#71717a' }}>Blue (B):</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={nametagColor.b}
                    onChange={(e) => setNametagColor({ ...nametagColor, b: e.target.value })}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    ref={colorPickerRef}
                    type="color"
                    value={rgbToHex(nametagColor.r, nametagColor.g, nametagColor.b)}
                    onChange={handleColorPickerChange}
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      width: 0,
                      height: 0,
                      pointerEvents: 'none'
                    }}
                  />
                  <div
                    onClick={handleColorPreviewClick}
                    style={{ 
                      width: '60px', 
                      height: '60px', 
                      backgroundColor: `rgb(${nametagColor.r}, ${nametagColor.g}, ${nametagColor.b})`,
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '8px',
                      marginTop: '20px',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="Click to open color picker"
                  >
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      opacity: 0.4,
                      pointerEvents: 'none',
                      color: 'white',
                      filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))'
                    }}>
                      <IconColorPicker />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="button-group">
              <button 
                onClick={handleReadNametag} 
                disabled={nametagLoading || loading}
                className="btn btn-primary"
              >
                {nametagLoading ? 'Loading...' : (
                  <>
                    <IconRead /> Read
                  </>
                )}
              </button>
              <button 
                onClick={handleCreateNametag} 
                disabled={nametagLoading || loading}
                className="btn btn-success"
              >
                {nametagLoading ? 'Saving...' : (
                  <>
                    <IconAdd /> Create/Update
                  </>
                )}
              </button>
              <button 
                onClick={handleUpdateNametag} 
                disabled={nametagLoading || loading}
                className="btn btn-warning"
              >
                {nametagLoading ? 'Updating...' : (
                  <>
                    <IconEdit /> Update
                  </>
                )}
              </button>
              <button 
                onClick={handleDeleteNametag} 
                disabled={nametagLoading || loading}
                className="btn btn-danger"
              >
                {nametagLoading ? 'Deleting...' : (
                  <>
                    <IconTrash /> Delete
                  </>
                )}
              </button>
            </div>

            {nametagData && (
              <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'rgba(250, 250, 250, 0.8)', borderRadius: '8px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                <h3 style={{ marginTop: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#09090b', marginBottom: '8px' }}>Current Nametag Prefix Data:</h3>
                <pre style={{ margin: 0, fontSize: '0.8125rem', color: '#09090b', fontFamily: "'Courier New', monospace" }}>{JSON.stringify(nametagData, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        <footer className="footer">
          <p>DataStore: <strong>PlayerData</strong> | Key Format: <strong>Player_(userId)</strong> | Username is converted to userId automatically</p>
          <p style={{ marginTop: '10px' }}>Nametag DataStore: <strong>NameTagPrefix_Custom_v1</strong> | Key Format: <strong>uid_(userId)</strong></p>
        </footer>
      </div>
    </div>
  );
}

export default App;
