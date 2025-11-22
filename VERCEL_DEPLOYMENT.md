# Vercel Deployment Guide

This guide will help you deploy your Roblox DataStore Manager to Vercel.

## Prerequisites

1. A GitHub account
2. A Vercel account (sign up at [vercel.com](https://vercel.com))
3. Your Roblox API credentials (ROBLOX_API_KEY and UNIVERSE_ID)

## Step 1: Push to GitHub

If you haven't already, push your code to a GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/web-datastore.git
git push -u origin main
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect the project settings:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (root)
   - **Build Command**: `cd client && npm install && npm run build`
   - **Output Directory**: `client/build`

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts to link your project

## Step 3: Configure Environment Variables

1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Add the following environment variables:

   - **ROBLOX_API_KEY**: Your Roblox API key
   - **UNIVERSE_ID**: Your Roblox Universe ID
   - **REACT_APP_API_URL**: Leave this empty (will use relative paths automatically)

3. **Important**: After adding environment variables, you need to redeploy:
   - Go to **Deployments** tab
   - Click the **"..."** menu on the latest deployment
   - Select **"Redeploy"**

## Step 4: Update Roblox API Key IP Whitelist

Since Vercel uses dynamic IP addresses, you need to update your Roblox API key settings:

1. Go to [Roblox Creator Dashboard - Credentials](https://create.roblox.com/dashboard/credentials)
2. Click **"Edit"** on your API key
3. Scroll to **"Accepted IP Addresses"**
4. Set it to `0.0.0.0/0` to allow all IPs (or add Vercel's IP ranges if you prefer)
5. Click **"Save"**

**Note**: Allowing all IPs (`0.0.0.0/0`) is less secure but necessary for serverless functions. Consider adding authentication to your web interface for production use.

## Step 5: Verify Deployment

1. Visit your Vercel deployment URL (e.g., `https://your-project.vercel.app`)
2. Test the application:
   - Try reading player data
   - Try creating/updating player data
   - Check the browser console for any errors

3. Test the API directly:
   - Visit `https://your-project.vercel.app/api/health` - should return status "ok"
   - Visit `https://your-project.vercel.app/api/test` - should test your API key

## Project Structure for Vercel

```
web-datastore/
├── api/                    # Vercel serverless functions
│   ├── players/
│   │   └── [username].js   # Dynamic route for /api/players/:username
│   ├── players.js          # Route for /api/players (list all)
│   ├── health.js           # Health check endpoint
│   ├── test.js             # API key test endpoint
│   ├── utils.js            # Shared utilities
│   └── package.json        # API dependencies
├── client/                 # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── server/                 # Original Express server (for local dev)
├── vercel.json             # Vercel configuration
└── package.json
```

## How It Works

- **Frontend**: React app is built and served as static files
- **Backend**: Express routes are converted to Vercel serverless functions in the `/api` directory
- **Routing**: Vercel automatically routes `/api/*` to serverless functions and everything else to the React app

## Local Development

You can still develop locally using the original Express server:

```bash
# Start both server and client
npm run dev

# Or separately
npm run server  # Starts Express server on port 5000
npm run client  # Starts React app on port 3000
```

## Troubleshooting

### API returns 404

- Check that your API routes are in the `/api` directory
- Verify the file structure matches the expected routes
- Check Vercel function logs in the dashboard

### CORS errors

- The serverless functions include CORS headers
- Make sure you're using relative API paths (which is automatic in production)

### Environment variables not working

- Make sure you've added them in Vercel dashboard
- Redeploy after adding environment variables
- Check that variable names match exactly (case-sensitive)

### API key authentication fails

- Verify your API key is set correctly in Vercel environment variables
- Check that IP whitelist allows all IPs (`0.0.0.0/0`)
- Test the API key using `/api/test` endpoint

## Custom Domain

To add a custom domain:

1. Go to **Settings** → **Domains** in your Vercel project
2. Add your domain
3. Follow the DNS configuration instructions

## Continuous Deployment

Vercel automatically deploys when you push to your main branch. Each push creates a new deployment preview.

## Support

For issues:
- Check Vercel logs in the dashboard
- Review the function logs for API errors
- Test endpoints directly using the `/api/test` and `/api/health` endpoints

