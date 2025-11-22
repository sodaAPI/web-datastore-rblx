/**
 * Script to verify Roblox API key configuration
 * Run with: node verify-api-key.js
 */

require('dotenv').config();
const axios = require('axios');

const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY?.trim();
const UNIVERSE_ID = process.env.UNIVERSE_ID?.trim();
const DATASTORE_NAME = 'PlayerData';

console.log('\n=== Roblox API Key Verification ===\n');

// Check if variables are set
if (!ROBLOX_API_KEY) {
  console.error('❌ ERROR: ROBLOX_API_KEY not set in .env file');
  process.exit(1);
}

if (!UNIVERSE_ID) {
  console.error('❌ ERROR: UNIVERSE_ID not set in .env file');
  process.exit(1);
}

// Display configuration
console.log('Configuration:');
console.log('  Universe ID:', UNIVERSE_ID);
console.log('  DataStore Name:', DATASTORE_NAME);
console.log('  API Key Length:', ROBLOX_API_KEY.length);
console.log('  API Key First 30 chars:', ROBLOX_API_KEY.substring(0, 30) + '...');
console.log('  API Key Last 30 chars:', '...' + ROBLOX_API_KEY.substring(ROBLOX_API_KEY.length - 30));
console.log('  Contains newlines:', ROBLOX_API_KEY.includes('\n') ? 'YES ⚠️' : 'NO ✓');
console.log('  Contains spaces:', ROBLOX_API_KEY.includes(' ') ? 'YES ⚠️' : 'NO ✓');
console.log('  Starts with quote:', ROBLOX_API_KEY.startsWith('"') || ROBLOX_API_KEY.startsWith("'") ? 'YES ⚠️' : 'NO ✓');
console.log('  Ends with quote:', ROBLOX_API_KEY.endsWith('"') || ROBLOX_API_KEY.endsWith("'") ? 'YES ⚠️' : 'NO ✓');

if (ROBLOX_API_KEY.length > 300) {
  console.log('\n⚠️  WARNING: API key seems unusually long (>300 chars).');
  console.log('   Roblox API keys are typically 100-200 characters.');
  console.log('   Check your .env file for extra characters or formatting issues.\n');
}

// Test API call
const BASE_URL = `https://apis.roblox.com/cloud/v2/universes/${UNIVERSE_ID}/data-stores/${encodeURIComponent(DATASTORE_NAME)}`;
const testUrl = `${BASE_URL}/entries?limit=1`;

console.log('\nTesting API connection...');
console.log('URL:', testUrl);
console.log('Method: GET');
console.log('Header: x-api-key: [HIDDEN]');

axios.get(testUrl, {
  headers: {
    'x-api-key': ROBLOX_API_KEY,
    'Content-Type': 'application/json'
  },
  validateStatus: () => true // Don't throw on any status
})
.then(response => {
  console.log('\n=== Response ===');
  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);
  
  if (response.status === 200) {
    console.log('\n✅ SUCCESS! API key is working correctly.');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } else if (response.status === 401) {
    console.log('\n❌ ERROR: 401 Unauthorized');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\nPossible causes:');
    console.log('1. IP Whitelisting: Your API key may be restricted to specific IP addresses.');
    console.log('   → Go to: https://create.roblox.com/dashboard/credentials');
    console.log('   → Edit your API key');
    console.log('   → Check "Accepted IP Addresses"');
    console.log('   → Set to 0.0.0.0/0 for testing (allows all IPs)');
    console.log('   → Or add your server\'s IP address');
    console.log('\n2. API Key Not Associated: The API key may not be associated with your Universe ID.');
    console.log('   → In API key settings, ensure your Universe ID is selected');
    console.log('\n3. API Key Permissions: The API key may not have the required permissions.');
    console.log('   → Ensure universe-datastore.object has: read, create, update, delete');
  } else if (response.status === 403) {
    console.log('\n❌ ERROR: 403 Forbidden - Resources not authorized');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    const errorCode = response.data?.code || response.data?.errors?.[0]?.code;
    if (errorCode === 7) {
      console.log('\n🔍 Code 7: "Resources not authorized"');
      console.log('This means your API key is valid, but it doesn\'t have access to the resource.');
      console.log('\n✅ FIX:');
      console.log('1. Verify Universe Association:');
      console.log('   → Go to: https://create.roblox.com/dashboard/credentials');
      console.log('   → Edit your API key');
      console.log('   → Under "Universe Access", ensure your Universe ID is selected');
      console.log('   → Current Universe ID:', UNIVERSE_ID);
      console.log('   → OR enable "All my experiences"');
      console.log('   → Click "Save"');
      console.log('\n2. Verify Permissions:');
      console.log('   → In API key settings, find "universe-datastore.object"');
      console.log('   → Ensure ALL are checked: read, create, update, delete');
      console.log('   → Click "Save"');
      console.log('\n3. Wait 1-2 minutes for changes to propagate, then try again.');
    } else {
      console.log('\nPossible causes:');
      console.log('1. Insufficient Permissions: API key doesn\'t have required scopes');
      console.log('2. API key not associated with the universe');
    }
  } else {
    console.log('\n⚠️  Unexpected status code');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  }
})
.catch(error => {
  console.error('\n❌ ERROR:', error.message);
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Response:', JSON.stringify(error.response.data, null, 2));
  }
});

