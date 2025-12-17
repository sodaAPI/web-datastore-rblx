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

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);

const IconUndo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6"></path>
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
  </svg>
);

const IconRedo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6"></path>
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path>
  </svg>
);

const IconStats = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);

const IconTrophy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
    <path d="M4 22h16"></path>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
  </svg>
);

const IconSun = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);

const IconMoon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
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
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  
  // Bulk operations state
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  
  // Undo/redo state for JSON editor
  const [jsonHistory, setJsonHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Statistics state
  const [statistics, setStatistics] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardSampleInfo, setLeaderboardSampleInfo] = useState(null);
  
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

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

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
      
      const jsonString = JSON.stringify(valueData, null, 2);
      setDataJson(jsonString);
      // Initialize history with current data
      setJsonHistory([jsonString]);
      setHistoryIndex(0);
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

  const handleListPlayers = async (cursor = null, append = false) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const params = cursor ? { cursor, limit: 100 } : { limit: 100 };
      const response = await axios.get(`${API_BASE_URL}/api/players`, { params });
      // Keys are now usernames (converted from userIds on server)
      const usernames = response.data.data?.keys || response.data.data?.dataStoreEntries?.map(e => e.id) || [];
      
      if (append && cursor) {
        // Append to existing list when loading more
        setPlayersList(prev => [...prev, ...usernames]);
        setFilteredPlayers(prev => [...prev, ...usernames]);
      } else {
        // Replace list when starting fresh
        setPlayersList(usernames);
        setFilteredPlayers(usernames);
      }
      
      setListCursor(response.data.data?.nextPageToken || response.data.data?.nextPageCursor || null);
      setShowList(true);
      setSuccess(`Loaded ${usernames.length} players${append ? ' (more)' : ''}. ${cursor ? 'Note: With 1M+ entries, use search to find specific players.' : ''}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to list players');
    } finally {
      setLoading(false);
    }
  };

  // Search and filter functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPlayers(playersList);
      return;
    }
    
    const filtered = playersList.filter(player => 
      player.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPlayers(filtered);
  }, [searchQuery, playersList]);

  // Undo/redo functionality for JSON editor
  const isUndoRedoRef = useRef(false);
  
  const saveToHistory = (jsonValue) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    
    const newHistory = jsonHistory.slice(0, historyIndex + 1);
    newHistory.push(jsonValue);
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(newHistory.length - 1);
    }
    setJsonHistory(newHistory);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoRef.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setDataJson(jsonHistory[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < jsonHistory.length - 1) {
      isUndoRedoRef.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setDataJson(jsonHistory[newIndex]);
    }
  };

  // Save to history when dataJson changes (debounced)
  useEffect(() => {
    if (dataJson && jsonHistory.length > 0 && jsonHistory[historyIndex] !== dataJson && !isUndoRedoRef.current) {
      const timer = setTimeout(() => {
        saveToHistory(dataJson);
      }, 1000); // Debounce 1 second
      return () => clearTimeout(timer);
    }
  }, [dataJson]);

  // Keyboard shortcuts for undo/redo (only in textarea)
  useEffect(() => {
    const textarea = document.querySelector('.textarea');
    if (!textarea) return;
    
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && e.target === textarea) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && e.target === textarea) {
        e.preventDefault();
        handleRedo();
      }
    };
    
    textarea.addEventListener('keydown', handleKeyDown);
    return () => textarea.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, jsonHistory]);

  // Bulk operations
  const handleToggleSelectPlayer = (username) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(username)) {
      newSelected.delete(username);
    } else {
      newSelected.add(username);
    }
    setSelectedPlayers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPlayers.size === filteredPlayers.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(filteredPlayers));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPlayers.size === 0) {
      setError('No players selected');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedPlayers.size} player(s)?`)) {
      return;
    }

    setBulkLoading(true);
    setError('');
    setSuccess('');

    try {
      const deletePromises = Array.from(selectedPlayers).map(username =>
        axios.delete(`${API_BASE_URL}/api/players/${username}`).catch(err => ({ error: err, username }))
      );
      
      const results = await Promise.all(deletePromises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        setError(`Failed to delete ${errors.length} player(s)`);
      } else {
        setSuccess(`Successfully deleted ${selectedPlayers.size} player(s)!`);
      }
      
      setSelectedPlayers(new Set());
      handleListPlayers(); // Refresh list
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to delete players');
    } finally {
      setBulkLoading(false);
    }
  };

  // Statistics dashboard - optimized for large datasets
  const fetchStatistics = async () => {
    setStatsLoading(true);
    try {
      // For 1M+ entries, we'll sample the first page only
      const response = await axios.get(`${API_BASE_URL}/api/players`, { params: { limit: 100 } });
      const samplePlayers = response.data.data?.keys || [];
      
      // Sample a smaller subset for data validation
      const sampleSize = Math.min(20, samplePlayers.length);
      const playerDataPromises = samplePlayers.slice(0, sampleSize).map(async (username) => {
        try {
          const playerResponse = await axios.get(`${API_BASE_URL}/api/players/${username}`);
          return { username, data: playerResponse.data?.data };
        } catch {
          return { username, data: null };
        }
      });
      
      const playerDataList = await Promise.all(playerDataPromises);
      const validData = playerDataList.filter(p => p.data);
      const dataPercentage = sampleSize > 0 ? Math.round((validData.length / sampleSize) * 100) : 0;
      
      // Estimate total based on sample
      setStatistics({
        totalPlayers: '1M+',
        estimatedTotal: 1000000,
        playersWithData: validData.length,
        sampleSize: sampleSize,
        dataPercentage: dataPercentage,
        note: 'Statistics are estimated from a sample due to large dataset size'
      });
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
      setError('Failed to fetch statistics. The dataset may be too large.');
    } finally {
      setStatsLoading(false);
    }
  };

  // Leaderboard for top 10 summits - uses dedicated API endpoint with caching
  const fetchLeaderboard = async (force = false) => {
    setLeaderboardLoading(true);
    setError('');
    setSuccess('');
    try {
      // Use dedicated leaderboard API endpoint with caching
      // Cached for 10 minutes, so we can use larger sample sizes without hitting rate limits
      const response = await axios.get(`${API_BASE_URL}/api/leaderboard`, {
        params: {
          limit: 10,
          sampleSize: 2000, // Increased to 2000 - cached so no rate limit issues
          forceRefresh: force
        }
      });
      
      if (response.data.success && response.data.data) {
        const leaderboardData = response.data.data.leaderboard || [];
        setLeaderboard(leaderboardData.map(p => ({
          username: p.username,
          summit: p.summit,
          rank: p.rank
        })));
        setLeaderboardSampleInfo(response.data.data);
        
        if (leaderboardData.length === 0) {
          setError('No summit data found. Make sure player data contains "summit", "summits", "bestSummit", "highestSummit", or "Summits" field.');
        } else {
          const cacheInfo = response.data.data.cached 
            ? ` (from cache, ${Math.round(response.data.data.cacheAge / 60)} min old)`
            : ' (fresh data)';
          setSuccess(`Leaderboard loaded! Sampled ${response.data.data.sampleSize} players${cacheInfo}.`);
        }
      } else {
        setError('Failed to fetch leaderboard data');
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch leaderboard');
    } finally {
      setLeaderboardLoading(false);
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
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>
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
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Logged in as: <strong style={{ color: 'var(--text-primary)' }}>{authUsername}</strong></span>
              <button 
                onClick={toggleDarkMode}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', fontSize: '0.875rem', minWidth: 'auto', marginTop: 0 }}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <IconSun /> : <IconMoon />}
              </button>
              <button 
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.875rem', marginTop: 0 }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Player Data (JSON)</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', minWidth: 'auto', marginTop: 0 }}
                  title="Undo (Ctrl+Z)"
                >
                  <IconUndo />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= jsonHistory.length - 1}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', minWidth: 'auto', marginTop: 0 }}
                  title="Redo (Ctrl+Y)"
                >
                  <IconRedo />
                </button>
              </div>
            </div>
            <textarea
              value={dataJson}
              onChange={(e) => setDataJson(e.target.value)}
              placeholder='Enter JSON data (e.g., {"Summits": 100, "Checkpoints": 5})'
              className="textarea"
              rows="15"
            />
            <p className="help-text">
              <IconInfo /> Tip: Use "Read" to load existing data, or enter new JSON data to create/update. Use undo/redo buttons to navigate history.
            </p>
          </div>

          <div className="card">
            <h2>List All Players</h2>
            <p className="help-text" style={{ marginBottom: '15px', fontSize: '0.8125rem', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <IconInfo /> <strong>Large Dataset:</strong> Your datastore contains 1M+ entries. Use search to find specific players. Loading all entries is not recommended.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button 
                onClick={() => {
                  setPlayersList([]);
                  setFilteredPlayers([]);
                  setSearchQuery('');
                  handleListPlayers();
                }} 
                disabled={loading}
                className="btn btn-info"
                style={{ flex: 1 }}
              >
                {loading ? 'Loading...' : (
                  <>
                    <IconList /> Load First 100 Players
                  </>
                )}
              </button>
            </div>

            {showList && playersList.length > 0 && (
              <div className="players-list">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ margin: 0 }}>Players ({filteredPlayers.length} of {playersList.length})</h3>
                  {selectedPlayers.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkLoading}
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: '0.75rem', marginTop: 0 }}
                    >
                      {bulkLoading ? 'Deleting...' : `Delete ${selectedPlayers.size} Selected`}
                    </button>
                  )}
                </div>
                
                <div style={{ position: 'relative', marginBottom: '15px' }}>
                  <IconSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search players..."
                    className="input"
                    style={{ paddingLeft: '40px' }}
                  />
                </div>

                {selectedPlayers.size > 0 && (
                  <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      onClick={handleSelectAll}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.75rem', marginTop: 0 }}
                    >
                      {selectedPlayers.size === filteredPlayers.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {selectedPlayers.size} selected
                    </span>
                  </div>
                )}

                {loading && filteredPlayers.length === 0 ? (
                  <div className="skeleton-loader">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="skeleton-item" />
                    ))}
                  </div>
                ) : filteredPlayers.length > 0 ? (
                  <div className="players-grid">
                    {filteredPlayers.map((key, index) => (
                      <div 
                        key={index} 
                        className={`player-item ${selectedPlayers.has(key) ? 'selected' : ''}`}
                        onClick={(e) => {
                          if (e.target.type === 'checkbox') return;
                          handleSelectPlayer(key);
                        }}
                        style={{ position: 'relative', cursor: 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlayers.has(key)}
                          onChange={() => handleToggleSelectPlayer(key)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                        />
                        <span style={{ marginLeft: selectedPlayers.has(key) ? '24px' : '0' }}>{key}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">No players found matching "{searchQuery}"</p>
                )}

                {listCursor && (
                  <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => handleListPlayers(listCursor, true)} 
                      disabled={loading}
                      className="btn btn-secondary"
                      style={{ marginTop: 0 }}
                    >
                      {loading ? 'Loading...' : 'Load More (100)'}
                    </button>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Loaded {playersList.length} players
                    </span>
                    {playersList.length >= 1000 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        Tip: Use search to find specific players instead of loading all
                      </span>
                    )}
                  </div>
                )}
                <p className="help-text" style={{ marginTop: '10px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  <IconInfo /> Click on any player to load their data. Use checkboxes for bulk operations.
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

          {/* Statistics Dashboard */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Statistics Dashboard</h2>
              <button
                onClick={fetchStatistics}
                disabled={statsLoading}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem', marginTop: 0 }}
              >
                {statsLoading ? 'Loading...' : (
                  <>
                    <IconStats /> Refresh
                  </>
                )}
              </button>
            </div>
            {statsLoading ? (
              <div className="skeleton-loader">
                <div className="skeleton-item" style={{ height: '60px' }} />
                <div className="skeleton-item" style={{ height: '60px' }} />
                <div className="skeleton-item" style={{ height: '60px' }} />
              </div>
            ) : statistics ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                  <div style={{ padding: '15px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Total Players</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{statistics.totalPlayers}</div>
                  </div>
                  <div style={{ padding: '15px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>With Data</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{statistics.playersWithData}/{statistics.sampleSize}</div>
                  </div>
                  <div style={{ padding: '15px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Data %</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{statistics.dataPercentage}%</div>
                  </div>
                </div>
                {statistics.note && (
                  <p className="help-text" style={{ fontSize: '0.75rem', marginTop: '10px' }}>
                    <IconInfo /> {statistics.note}
                  </p>
                )}
              </>
            ) : (
              <p className="help-text">Click "Refresh" to load statistics (estimated from sample)</p>
            )}
          </div>

          {/* Leaderboard */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Top 10 Summits Leaderboard</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => fetchLeaderboard(false)}
                  disabled={leaderboardLoading}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', marginTop: 0 }}
                >
                  {leaderboardLoading ? 'Loading...' : (
                    <>
                      <IconTrophy /> Refresh
                    </>
                  )}
                </button>
                <button
                  onClick={() => fetchLeaderboard(true)}
                  disabled={leaderboardLoading}
                  className="btn"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', marginTop: 0 }}
                  title="Force refresh (bypasses cache)"
                >
                  Force Refresh
                </button>
              </div>
            </div>
            {leaderboardLoading ? (
              <div className="skeleton-loader">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="skeleton-item" style={{ height: '40px' }} />
                ))}
              </div>
            ) : leaderboard.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {leaderboard.map((player, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: index < 3 ? 'var(--bg-tertiary)' : 'transparent',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setUsername(player.username);
                      handleRead();
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = index < 3 ? 'var(--bg-tertiary)' : 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: index === 0 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                                   index === 1 ? 'linear-gradient(135deg, #71717a 0%, #52525b 100%)' :
                                   index === 2 ? 'linear-gradient(135deg, #b45309 0%, #92400e 100%)' :
                                   'var(--bg-tertiary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        {index + 1}
                      </span>
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{player.username}</span>
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                      {player.summit.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p className="help-text">Click "Refresh" to load leaderboard. Results are cached for 10 minutes to avoid rate limits.</p>
                <p className="help-text" style={{ fontSize: '0.75rem', marginTop: '5px', color: 'var(--text-secondary)' }}>
                  First load may take 1-2 minutes. Subsequent loads are instant from cache. Use "Force Refresh" to bypass cache.
                </p>
                <p className="help-text" style={{ fontSize: '0.75rem', marginTop: '5px' }}>
                  Make sure player data contains "summit", "summits", "bestSummit", "highestSummit", or "Summits" field.
                </p>
              </div>
            )}
            {leaderboardSampleInfo && (
              <p className="help-text" style={{ fontSize: '0.75rem', marginTop: '10px', fontStyle: 'italic' }}>
                {leaderboardSampleInfo.note}
              </p>
            )}
          </div>

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
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Red (R):</label>
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
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Green (G):</label>
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
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Blue (B):</label>
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
                <h3 style={{ marginTop: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Current Nametag Prefix Data:</h3>
                <pre style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-primary)', fontFamily: "'Courier New', monospace" }}>{JSON.stringify(nametagData, null, 2)}</pre>
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
