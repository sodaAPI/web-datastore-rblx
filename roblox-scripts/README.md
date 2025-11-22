# Roblox Scripts for Real-Time Data Updates

These scripts allow your Roblox game to detect and apply DataStore updates made through the web interface in real-time.

## Quick Setup

1. **Copy `DataRefreshService.lua`** to your Roblox game
2. Place it in **ServerScriptService**
3. The script will automatically:
   - Load player data when they join
   - Refresh data every 30 seconds
   - Allow players to use `/refresh` command

## Configuration

Edit these variables at the top of `DataRefreshService.lua`:

```lua
local DATASTORE_NAME = "PlayerData"  -- Must match your web interface
local REFRESH_INTERVAL = 30          -- Seconds between refreshes
local ENABLE_MANUAL_REFRESH = true   -- Enable /refresh command
```

## How to Use

### Automatic Refresh
The script automatically refreshes all players' data every 30 seconds (or whatever interval you set).

### Manual Refresh
Players can type `/refresh` or `!refresh` in chat to immediately refresh their data.

### Using in Your Scripts

```lua
-- In another script, require the service
local DataRefreshService = require(game.ServerScriptService.DataRefreshService)

-- Get a player's current data
local playerData = DataRefreshService.GetPlayerData(player)

-- Manually refresh a player's data
DataRefreshService.RefreshPlayerData(player)

-- Save player data (updates DataStore)
DataRefreshService.SavePlayerData(player, {
    coins = 100,
    level = 5,
    -- ... your data
})
```

## Important Notes

1. **DataStore Name**: Must match exactly with your web interface (`PlayerData`)
2. **Key Format**: Uses `Player_{userId}` format (matches web interface)
3. **Rate Limits**: Don't set REFRESH_INTERVAL too low (30 seconds is safe)
4. **Performance**: Frequent refreshes can impact game performance

## Troubleshooting

- **Data not refreshing**: Check that DATASTORE_NAME matches your web interface
- **Too slow**: Increase REFRESH_INTERVAL (but updates will be less frequent)
- **Rate limit errors**: Increase REFRESH_INTERVAL to 60+ seconds

