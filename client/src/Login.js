import React, { useState } from 'react';
import axios from 'axios';
import './App.css';
import { API_BASE_URL } from './config';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        { username, password },
        { withCredentials: true } // Important for session cookies (local dev)
      );

      if (response.data.success) {
        // Check if token-based auth (Vercel) or session-based (local dev)
        if (response.data.token) {
          // Token-based auth (Vercel) - store token
          localStorage.setItem('authToken', response.data.token);
        } else {
          // Session-based auth (local dev) - token will be null, session cookie handles it
          localStorage.removeItem('authToken'); // Clear any old token
        }
        onLogin(response.data.username);
      } else {
        setError(response.data.error || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <div className="login-container">
          <div className="login-card">
            <header className="header">
              <h1 style={{ color: 'blue' }}>DataStore Manager</h1>
              <p className="subtitle" style={{ color: 'blue' }}>Please login to continue</p>
            </header>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="username">Username:</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="input"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password:</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="input"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '20px' }}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

