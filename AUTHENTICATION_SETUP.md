# Authentication Setup Guide

The application now includes a simple authentication system that requires users to login before accessing the DataStore management interface.

## Quick Setup

### 1. Install New Dependencies

The server now requires `express-session`. Install it:

```bash
cd server
npm install
```

This will install `express-session` which was added to `package.json`.

### 2. Update Environment Variables

Add these new variables to your `server/.env` file:

```env
# Existing variables
ROBLOX_API_KEY=your_roblox_api_key_here
UNIVERSE_ID=your_universe_id_here
PORT=5000

# New authentication variables
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here
SESSION_SECRET=your_random_secret_key_here
```

**Generate a secure SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `SESSION_SECRET`.

### 3. Restart the Server

After updating `.env`, restart your server:

```bash
npm run server
```

## How It Works

- **Login**: Users must login with the username and password from `.env`
- **Session-based**: Uses express-session for secure session management
- **Protected Routes**: All API routes (except auth endpoints) require authentication
- **Auto-logout**: Users are automatically logged out if session expires or becomes invalid

## Security Notes

1. **Change Default Credentials**: Never use default username/password in production
2. **Strong Password**: Use a strong password for `ADMIN_PASSWORD`
3. **Session Secret**: Use a long, random string for `SESSION_SECRET`
4. **HTTPS in Production**: Sessions use secure cookies when `NODE_ENV=production`
5. **Environment Variables**: Never commit `.env` file to version control

## API Endpoints

### Public Endpoints (No Auth Required)
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/check` - Check authentication status
- `GET /api/health` - Health check

### Protected Endpoints (Auth Required)
- `GET /api/players/:username` - Get player data
- `POST /api/players/:username` - Create/Update player data
- `PUT /api/players/:username` - Update player data
- `DELETE /api/players/:username` - Delete player data
- `GET /api/players` - List all players

## Troubleshooting

### "Unauthorized" errors
- Make sure you're logged in
- Check that session cookies are being sent (check browser dev tools)
- Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set correctly in `.env`

### Login not working
- Check server console for errors
- Verify environment variables are loaded correctly
- Make sure `express-session` is installed: `cd server && npm install`

### Session expires too quickly
- Default session duration is 24 hours
- You can modify this in `server/index.js` (look for `maxAge` in session config)

## For Vercel Deployment

When deploying to Vercel, add these environment variables in the Vercel dashboard:
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `ROBLOX_API_KEY`
- `UNIVERSE_ID`

**Note**: Vercel serverless functions may need additional configuration for session storage. For production, consider using a session store like Redis or database-backed sessions.

