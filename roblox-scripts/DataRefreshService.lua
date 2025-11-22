-- DataRefreshService.lua
-- Place this in ServerScriptService
-- This script periodically refreshes player data from DataStore
-- so that external updates (from web interface) appear in real-time

local DataStoreService = game:GetService("DataStoreService")
local RunService = game:GetService("RunService")
local HttpService = game:GetService("HttpService")

local DATASTORE_NAME = "PlayerData"
local REFRESH_INTERVAL = 30 -- Refresh every 30 seconds (adjust as needed)
local ENABLE_MANUAL_REFRESH = true -- Set to false to disable /refresh command

local playerDataStore = DataStoreService:GetDataStore(DATASTORE_NAME)
local playerDataCache = {}

-- Helper function to get player key (matches your web interface format)
local function getPlayerKey(userId)
    return "Player_" .. tostring(userId)
end

-- Setup player data storage
local function setupPlayerData(player)
    local folder = player:FindFirstChild("PlayerData")
    if not folder then
        folder = Instance.new("Folder")
        folder.Name = "PlayerData"
        folder.Parent = player
    end
    
    local dataValue = folder:FindFirstChild("Data")
    if not dataValue then
        dataValue = Instance.new("StringValue")
        dataValue.Name = "Data"
        dataValue.Value = "{}"
        dataValue.Parent = folder
    end
    
    return dataValue
end

-- Load initial data when player joins
local function loadPlayerData(player)
    local userId = player.UserId
    local key = getPlayerKey(userId)
    
    local success, data = pcall(function()
        return playerDataStore:GetAsync(key)
    end)
    
    if success and data then
        local dataValue = setupPlayerData(player)
        dataValue.Value = HttpService:JSONEncode(data)
        playerDataCache[player] = data
        print("[DataRefresh] Loaded data for", player.Name)
        return true
    else
        print("[DataRefresh] Failed to load data for", player.Name)
        return false
    end
end

-- Refresh data from DataStore (called periodically or manually)
local function refreshPlayerData(player)
    local userId = player.UserId
    local key = getPlayerKey(userId)
    
    local success, data = pcall(function()
        return playerDataStore:GetAsync(key)
    end)
    
    if success and data then
        local playerData = player:FindFirstChild("PlayerData")
        if playerData then
            local dataValue = playerData:FindFirstChild("Data")
            if dataValue then
                -- Check if data actually changed
                local oldData = playerDataCache[player]
                local dataChanged = not oldData or HttpService:JSONEncode(oldData) ~= HttpService:JSONEncode(data)
                
                if dataChanged then
                    dataValue.Value = HttpService:JSONEncode(data)
                    playerDataCache[player] = data
                    print("[DataRefresh] Refreshed data for", player.Name)
                    
                    -- Optional: Notify player that data was updated
                    -- You can add a RemoteEvent here to notify the client
                    return true
                end
            end
        end
    else
        warn("[DataRefresh] Failed to refresh data for", player.Name, ":", tostring(data))
    end
    return false
end

-- Save player data to DataStore (call this when data changes in-game)
local function savePlayerData(player, data)
    local userId = player.UserId
    local key = getPlayerKey(userId)
    
    local success, error = pcall(function()
        playerDataStore:SetAsync(key, data)
    end)
    
    if success then
        playerDataCache[player] = data
        local dataValue = setupPlayerData(player)
        dataValue.Value = HttpService:JSONEncode(data)
        print("[DataRefresh] Saved data for", player.Name)
        return true
    else
        warn("[DataRefresh] Failed to save data for", player.Name, ":", tostring(error))
        return false
    end
end

-- Player joins
game.Players.PlayerAdded:Connect(function(player)
    -- Load initial data
    loadPlayerData(player)
    
    -- Manual refresh command (optional)
    if ENABLE_MANUAL_REFRESH then
        player.Chatted:Connect(function(message)
            local command = message:lower():gsub("%s+", "")
            if command == "/refresh" or command == "!refresh" then
                if refreshPlayerData(player) then
                    -- You can add player notification here
                    print("[DataRefresh] Player", player.Name, "manually refreshed their data")
                end
            end
        end)
    end
    
    -- Clean up when player leaves
    player.PlayerRemoving:Connect(function()
        playerDataCache[player] = nil
    end)
end)

-- Periodic refresh for all online players
spawn(function()
    while true do
        wait(REFRESH_INTERVAL)
        for _, player in pairs(game.Players:GetPlayers()) do
            if player.Parent then -- Make sure player is still in game
                refreshPlayerData(player)
            end
        end
    end
end)

-- Export functions for use in other scripts
local DataRefreshService = {}
DataRefreshService.RefreshPlayerData = refreshPlayerData
DataRefreshService.LoadPlayerData = loadPlayerData
DataRefreshService.SavePlayerData = savePlayerData
DataRefreshService.GetPlayerData = function(player)
    local playerData = player:FindFirstChild("PlayerData")
    if playerData then
        local dataValue = playerData:FindFirstChild("Data")
        if dataValue then
            local success, data = pcall(function()
                return HttpService:JSONDecode(dataValue.Value)
            end)
            if success then
                return data
            end
        end
    end
    return nil
end

return DataRefreshService

