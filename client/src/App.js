import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { API_BASE_URL } from './config';
import Login from './Login';

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
      const errorMessage = err.response?.data?.error || err.message || 'Failed to read player data';
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

  // Show login if not authenticated
  if (checkingAuth) {
    return (
      <div className="App">
        <div className="container">
          <div style={{ textAlign: 'center', padding: '50px' }}>
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
              <span style={{ fontSize: '0.9rem', color: '#666' }}>Logged in as: <strong>{authUsername}</strong></span>
              <button 
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
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
                {loading ? 'Loading...' : '📖 Read'}
              </button>
              <button 
                onClick={handleCreate} 
                disabled={loading}
                className="btn btn-success"
              >
                {loading ? 'Saving...' : '➕ Create/Update'}
              </button>
              <button 
                onClick={handleUpdate} 
                disabled={loading}
                className="btn btn-warning"
              >
                {loading ? 'Updating...' : '✏️ Update'}
              </button>
              <button 
                onClick={handleDelete} 
                disabled={loading}
                className="btn btn-danger"
              >
                {loading ? 'Deleting...' : '🗑️ Delete'}
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
              💡 Tip: Use "Read" to load existing data, or enter new JSON data to create/update
            </p>
          </div>

          <div className="card">
            <h2>List All Players</h2>
            <button 
              onClick={() => handleListPlayers()} 
              disabled={loading}
              className="btn btn-info"
            >
              {loading ? 'Loading...' : '📋 List Players'}
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
                <p className="help-text" style={{ marginTop: '10px', fontSize: '0.85rem', color: '#666' }}>
                  💡 Click on any player to load their data
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
        </div>

        <footer className="footer">
          <p>DataStore: <strong>PlayerData</strong> | Key Format: <strong>Player_(userId)</strong> | Username is converted to userId automatically</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
