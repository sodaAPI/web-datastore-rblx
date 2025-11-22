/**
 * Script to help fix .env file issues
 * This will show you what's in your .env file and help identify problems
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

console.log('\n=== .env File Analysis ===\n');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found at:', envPath);
  console.log('\nCreate a .env file with:');
  console.log('ROBLOX_API_KEY=your_api_key_here');
  console.log('UNIVERSE_ID=your_universe_id_here');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

console.log('File location:', envPath);
console.log('Total lines:', lines.length);
console.log('Total characters:', envContent.length);
console.log('\n--- File Contents (showing first 500 chars) ---');
console.log(envContent.substring(0, 500));
console.log('\n--- End of preview ---\n');

// Find ROBLOX_API_KEY line
const apiKeyLine = lines.find(line => line.startsWith('ROBLOX_API_KEY'));
if (!apiKeyLine) {
  console.error('❌ ROBLOX_API_KEY not found in .env file');
} else {
  console.log('Found ROBLOX_API_KEY line:');
  console.log('  Line length:', apiKeyLine.length);
  console.log('  Full line (first 100 chars):', apiKeyLine.substring(0, 100));
  
  // Extract the key value
  const match = apiKeyLine.match(/ROBLOX_API_KEY=(.+)/);
  if (match) {
    const keyValue = match[1].trim();
    console.log('\nExtracted API Key:');
    console.log('  Length:', keyValue.length);
    console.log('  First 50 chars:', keyValue.substring(0, 50));
    console.log('  Last 50 chars:', keyValue.substring(keyValue.length - 50));
    
    if (keyValue.length > 300) {
      console.log('\n⚠️  PROBLEM: API key is too long!');
      console.log('   Expected: 100-200 characters');
      console.log('   Actual:', keyValue.length, 'characters');
      console.log('\nThis usually means:');
      console.log('  1. The API key was copied with extra text');
      console.log('  2. Multiple lines were concatenated');
      console.log('  3. There\'s extra content after the key');
      console.log('\nTo fix:');
      console.log('  1. Go to: https://create.roblox.com/dashboard/credentials');
      console.log('  2. Copy ONLY the API key (should be one long string)');
      console.log('  3. In your .env file, make sure it looks like:');
      console.log('     ROBLOX_API_KEY=your_key_here');
      console.log('  4. Make sure there\'s nothing after the key on that line');
      console.log('  5. Make sure there are no line breaks in the middle of the key');
    } else if (keyValue.length < 50) {
      console.log('\n⚠️  WARNING: API key seems too short');
    } else {
      console.log('\n✅ API key length looks reasonable');
    }
  }
}

// Find UNIVERSE_ID line
const universeIdLine = lines.find(line => line.startsWith('UNIVERSE_ID'));
if (!universeIdLine) {
  console.error('❌ UNIVERSE_ID not found in .env file');
} else {
  console.log('\nFound UNIVERSE_ID line:');
  console.log('  Full line:', universeIdLine);
}

console.log('\n--- All lines in .env file ---');
lines.forEach((line, index) => {
  if (line.trim()) {
    console.log(`Line ${index + 1}: ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
  }
});

