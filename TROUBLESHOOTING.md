# Troubleshooting Roblox API Errors

## Error: 403 "Resources not authorized" (Code 7)

**This means your API key is valid, but it doesn't have access to the resource.**

### Quick Fix:

1. **Verify Universe Association:**
   - Go to [Roblox Creator Dashboard - Credentials](https://create.roblox.com/dashboard/credentials)
   - Click "Edit" on your API key
   - Under **"Universe Access"**, ensure your Universe ID is selected
   - OR enable "All my experiences" if you want to use it for multiple universes
   - Click "Save"
   - Wait 1-2 minutes

2. **Verify Permissions:**
   - In the same API key settings
   - Under **"Permissions"**, find **"universe-datastore.object"**
   - Ensure ALL of these are checked:
     - ✅ `read`
     - ✅ `create`
     - ✅ `update`
     - ✅ `delete`
   - Click "Save"
   - Wait 1-2 minutes

3. **Verify Universe ID:**
   - Double-check that `UNIVERSE_ID` in your `.env` file matches your actual Roblox experience ID
   - You can find it in your Roblox game settings

4. **Try again** - The error should be resolved!

---

## Error: 401 "Not authorized" (Code 16)

If you're getting a 401 "Not authorized" error with code 16, follow these steps **in order**:

## Step 1: Check IP Whitelisting (MOST COMMON FIX)

1. Go to [Roblox Creator Dashboard - Credentials](https://create.roblox.com/dashboard/credentials)
2. Find your API key and click **"Edit"**
3. Scroll down to **"Accepted IP Addresses"** section
4. **Set it to `0.0.0.0/0`** (allows all IPs - for testing)
   - OR add your server's public IP address
5. Click **"Save"**
6. **Wait 2-3 minutes** for changes to propagate
7. Try your request again

**Why this matters:** If your API key is restricted to specific IPs and your server's IP isn't whitelisted, you'll get a 401 error even with a valid API key.

## Step 2: Verify API Key is Associated with Universe

1. In the API key settings (same page as above)
2. Check **"Universe Access"** section
3. Ensure your Universe ID (`98711018939494`) is selected
   - OR enable "All my experiences" if you want to use it for multiple universes
4. Click **"Save"**
5. Wait 1-2 minutes
6. Try again

## Step 3: Verify API Key Permissions

1. In the API key settings
2. Under **"Permissions"**, find **"universe-datastore.object"**
3. Ensure ALL of these are checked:
   - ✅ `read`
   - ✅ `create`
   - ✅ `update`
   - ✅ `delete`
4. Click **"Save"**
5. Wait 1-2 minutes
6. Try again

## Step 4: Check API Key Format in .env File (CRITICAL!)

**If your API key is >300 characters, this is the problem!**

1. **Run the diagnostic script:**
   ```bash
   cd server
   node fix-env.js
   ```
   This will show you exactly what's in your `.env` file

2. **Check the format** - it should be:
   ```
   ROBLOX_API_KEY=your_actual_key_here
   UNIVERSE_ID=98711018939494
   ```

3. **Common mistakes:**
   - ❌ `ROBLOX_API_KEY = key` (has spaces)
   - ❌ `ROBLOX_API_KEY="key"` (has quotes)
   - ❌ `ROBLOX_API_KEY=key\n` (has newline)
   - ❌ API key copied with extra text or multiple lines
   - ✅ `ROBLOX_API_KEY=key` (correct - single line, no spaces, no quotes)

4. **If your API key is 900+ characters:**
   - The key was likely copied incorrectly
   - Go to [Roblox Creator Dashboard - Credentials](https://create.roblox.com/dashboard/credentials)
   - Copy the API key again - it should be ONE long string (100-200 chars)
   - Paste it into `.env` file on a SINGLE line
   - Make sure there's nothing after the key on that line
   - Save the file and restart the server

5. If you see any issues, fix them and restart the server

## Step 5: Run Verification Script

Run the diagnostic script to see detailed information:

```bash
cd server
node verify-api-key.js
```

This will show:
- API key length and format
- Whether it contains unwanted characters
- Test the actual API connection
- Show the exact error from Roblox

## Step 6: Check Server Console Logs

When you start your server, check the console output. It should show:
- API key length (should be 100-200 characters, not 960!)
- First/last 20 characters of the key
- Whether it contains newlines or spaces

If the API key length is >300 characters, there's likely a formatting issue in your `.env` file.

## Step 7: Regenerate API Key (Last Resort)

If nothing else works:

1. Go to [Roblox Creator Dashboard - Credentials](https://create.roblox.com/dashboard/credentials)
2. Create a **new** API key
3. Set permissions:
   - `universe-datastore.object`: read, create, update, delete
4. Set IP whitelist to `0.0.0.0/0` (for testing)
5. Associate with your Universe ID
6. Copy the new key
7. Update your `server/.env` file with the new key
8. Restart your server
9. Try again

## Still Not Working?

If you've tried all the above steps and still get the error:

1. **Check the server console logs** - they now show detailed error information
2. **Use the test endpoint**: Visit `http://localhost:5000/api/test` in your browser
3. **Check Roblox Developer Forum**: [devforum.roblox.com](https://devforum.roblox.com/) - search for "401 unauthorized" or "code 16"

## Quick Checklist

- [ ] IP whitelist set to `0.0.0.0/0` or includes your server IP
- [ ] API key associated with your Universe ID
- [ ] API key has `universe-datastore.object` with read, create, update, delete
- [ ] `.env` file has correct format (no spaces, no quotes, no newlines)
- [ ] API key length is reasonable (100-200 chars, not 960!)
- [ ] Waited 2-3 minutes after making changes
- [ ] Restarted the server after changing `.env` file

