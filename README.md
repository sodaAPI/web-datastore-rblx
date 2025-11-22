# Roblox DataStore Manager

A modern web interface for managing CRUD operations on Roblox DataStore entries. This application allows you to create, read, update, and delete player data from your Roblox experience's DataStore.

> **Having authentication issues?** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for step-by-step solutions to "Not authorized" (401) errors.

## Features

- ✅ **Create/Update** player data
- ✅ **Read** player data by Username
- ✅ **Delete** player data
- ✅ **List** all players in the DataStore
- ✅ Modern, responsive UI
- ✅ Real-time error handling and success notifications
- ✅ JSON editor for data manipulation

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Roblox API Key (Open Cloud API)
- Universe ID (your Roblox experience ID)

## Setup Instructions

### 1. Get Your Roblox API Credentials

1. Go to [Roblox Creator Dashboard](https://create.roblox.com/dashboard/credentials)
2. Create a new API Key with the following permissions:
   - **universe-datastore.object**: `read`, `create`, `update`, `delete`
   - **universe-datastore.control**: `create`, `delete` (optional, for managing DataStores)
3. Copy your API Key
4. Find your Universe ID (Experience ID) from your Roblox game settings

**Note:** For basic CRUD operations, you need `universe-datastore.object` with all four permissions (read, create, update, delete).

### 2. Install Dependencies

```bash
# Install all dependencies (root, server, and client)
npm run install-all
```

Or install them separately:

```bash
# Root dependencies
npm install

# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `server` directory:

```bash
cd server
touch .env
```

Add the following to `server/.env`:

```
ROBLOX_API_KEY=your_roblox_api_key_here
UNIVERSE_ID=your_universe_id_here
PORT=5000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here
SESSION_SECRET=your_random_secret_key_here
```

**Important:** 
- Replace `your_roblox_api_key_here` and `your_universe_id_here` with your actual credentials.
- Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` to your desired login credentials.
- Set `SESSION_SECRET` to a random string (used for session encryption). You can generate one with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 4. Configure API URL (Optional)

If your backend runs on a different port or URL, create a `.env` file in the `client` directory:

```bash
cd client
touch .env
```

Add:

```
REACT_APP_API_URL=http://localhost:5000
```

## Running the Application

### Development Mode (Both Server and Client)

From the root directory:

```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend React app on `http://localhost:3000`

### Run Separately

**Backend only:**
```bash
npm run server
# or
cd server
npm run dev
```

**Frontend only:**
```bash
npm run client
# or
cd client
npm start
```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. **Login** with your admin credentials (set in `.env` file)
3. Enter a Roblox Username in the input field
3. Use the buttons to perform operations:
   - **Read**: Fetch existing player data
   - **Create/Update**: Create new data or update existing data
   - **Update**: Update existing player data
   - **Delete**: Remove player data
4. Use the JSON editor to modify player data
5. Click "List Players" to see all players in the DataStore

## ⚠️ Important: Real-Time Updates

**DataStore updates are NOT real-time!** If you update a player's data while they're online in the game, they won't see the changes immediately. The player will only see updates when:
- They leave and rejoin the experience, OR
- Your game script refreshes their data from the DataStore

**Solution**: See [DATASTORE_REALTIME_EXPLANATION.md](./DATASTORE_REALTIME_EXPLANATION.md) for details and [roblox-scripts/](./roblox-scripts/) for ready-to-use scripts that enable periodic data refresh.

## DataStore Configuration

- **DataStore Name**: `PlayerData`
- **Scope**: `global` (default scope)
- **Key Format**: `Player_(username)` (capital P)

For example, if a user's username is `123456789`, their data will be stored with the key `Player_123456789` in the `global` scope.

## API Endpoints

The backend provides the following REST API endpoints:

- `GET /api/players/:username` - Get player data
- `POST /api/players/:username` - Create/Update player data
- `PUT /api/players/:username` - Update player data
- `DELETE /api/players/:username` - Delete player data
- `GET /api/players` - List all players (with pagination)
- `GET /api/health` - Health check

## Project Structure

```
web-datastore/
├── server/           # Backend Express.js server
│   ├── index.js     # Main server file
│   ├── package.json
│   └── .env         # Environment variables (create this)
├── client/          # Frontend React application
│   ├── src/
│   │   ├── App.js   # Main React component
│   │   ├── App.css  # Styles
│   │   └── config.js # API configuration
│   └── package.json
├── package.json     # Root package.json with scripts
└── README.md
```

## Troubleshooting

### Server won't start
- Make sure you've created the `.env` file in the `server` directory
- Verify your `ROBLOX_API_KEY` and `UNIVERSE_ID` are correct
- Check that port 5000 is not already in use

### API errors

#### "Not authorized" or "401 Unauthorized" (Code 16)

This error means your API key authentication is failing. This is **most commonly caused by IP whitelisting**.

**Quick Diagnostic:**
1. Run the verification script: `cd server && node verify-api-key.js`
2. This will show you detailed information about your API key and test the connection

**Most Common Fix - IP Whitelisting:**
1. Go to [Roblox Creator Dashboard - Credentials](https://create.roblox.com/dashboard/credentials)
2. Click "Edit" on your API key
3. Scroll down to **"Accepted IP Addresses"** section
4. Either:
   - Set it to `0.0.0.0/0` to allow all IPs (for testing only - less secure)
   - OR add your server's public IP address
5. Click "Save"
6. Wait 1-2 minutes for changes to take effect
7. Try your request again

**Other Possible Causes:**

**First, test your API key configuration:**
1. Start your server: `npm run server` or `cd server && npm run dev`
2. Open your browser and go to: `http://localhost:5000/api/test`
3. This will show you detailed information about your API key configuration and test if it works
4. Check the server console logs for detailed error information
5. Check the response to see what's wrong

**Common causes:**
1. **IP Whitelisting**: Your API key might be restricted to specific IP addresses
   - Go to [Roblox Creator Dashboard - Credentials](https://create.roblox.com/dashboard/credentials)
   - Edit your API key
   - Check the "Accepted IP Addresses" section
   - Either add your server's IP address, or set it to `0.0.0.0/0` to allow all IPs (for testing only)
   - Click "Save"

2. **API Key Format**: Check for extra spaces or characters
   - Open `server/.env` file
   - Ensure `ROBLOX_API_KEY=` has no spaces before or after the `=`
   - Ensure the API key has no leading/trailing spaces
   - Example: `ROBLOX_API_KEY=your_key_here` (not `ROBLOX_API_KEY = your_key_here`)

3. **API Key Not Associated with Universe**: 
   - In the API key settings, ensure your Universe ID is selected
   - The API key must be associated with the specific universe you're trying to access

#### "The api key does not have sufficient scope to perform this operation"

This error means your API key doesn't have the required permissions. Follow these steps:

**First, test your API key configuration:**
1. Start your server: `npm run server` or `cd server && npm run dev`
2. Open your browser and go to: `http://localhost:5000/api/test`
3. This will show you detailed information about your API key configuration and test if it works
4. Check the response to see what's wrong

1. **Check API Key Permissions**:
   - Go to [Roblox Creator Dashboard - Credentials](https://create.roblox.com/dashboard/credentials)
   - Find your API key and click "Edit"
   - Under **universe-datastore.object**, ensure ALL of these are checked:
     - ✅ `read`
     - ✅ `create`
     - ✅ `update`
     - ✅ `delete`
   - Click "Save" to update the permissions

2. **Verify Experience Association**:
   - In the API key settings, make sure your experience (Universe ID) is selected
   - The API key must be associated with the specific universe you're trying to access
   - If managing multiple experiences, you may need to enable access for all experiences

3. **Check IP Restrictions** (if applicable):
   - Some API keys have IP restrictions
   - Ensure your server's IP address is allowed, or temporarily disable IP restrictions for testing

4. **Wait for Propagation**:
   - After updating permissions, wait 1-2 minutes for changes to take effect
   - Try your request again

5. **Verify Environment Variables**:
   - Double-check that `ROBLOX_API_KEY` in your `.env` file matches the API key from the dashboard
   - Ensure `UNIVERSE_ID` matches your experience ID exactly

#### Other API errors
- Verify your API key has the correct permissions:
  - `universe-datastore.object` with `read`, `create`, `update`, and `delete` permissions
- Ensure your Universe ID is correct
- Check that the DataStore name matches exactly: `PlayerData`
- Check server console logs for detailed error messages

### CORS errors
- Make sure the backend server is running
- Verify the API URL in `client/src/config.js` matches your backend URL

## Security Notes

- **Never commit your `.env` file** - it contains sensitive API keys
- The `.env` file is already in `.gitignore`
- Keep your API keys secure and rotate them regularly
- Consider adding authentication to the web interface for production use

## License

MIT

## Support

For issues related to:
- **Roblox API**: Check [Roblox Open Cloud Documentation](https://create.roblox.com/docs/open-cloud)
- **This Application**: Open an issue on the repository

#   w e b - d a t a s t o r e - r b l x  
 