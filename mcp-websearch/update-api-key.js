#!/usr/bin/env node

/**
 * This script updates the Brave Search API key in the server.js file.
 * Usage: node update-api-key.js YOUR_NEW_API_KEY
 */

const fs = require('fs');
const path = require('path');

// Get the new API key from command line arguments
const newApiKey = process.argv[2];

if (!newApiKey) {
  console.error('Error: No API key provided');
  console.log('Usage: node update-api-key.js YOUR_NEW_API_KEY');
  process.exit(1);
}

// Path to the server.js file
const serverFilePath = path.join(__dirname, 'server.js');

try {
  // Read the server.js file
  let serverFileContent = fs.readFileSync(serverFilePath, 'utf8');
  
  // Replace the API key
  const apiKeyRegex = /(const BRAVE_API_KEY = ')([^']+)(')/;
  const oldApiKey = serverFileContent.match(apiKeyRegex)[2];
  
  if (oldApiKey === newApiKey) {
    console.log('The provided API key is the same as the current one. No changes made.');
    process.exit(0);
  }
  
  serverFileContent = serverFileContent.replace(apiKeyRegex, `$1${newApiKey}$3`);
  
  // Write the updated content back to the file
  fs.writeFileSync(serverFilePath, serverFileContent);
  
  console.log(`✅ API key updated successfully!`);
  console.log(`Old key: ${oldApiKey.substring(0, 5)}...${oldApiKey.substring(oldApiKey.length - 5)}`);
  console.log(`New key: ${newApiKey.substring(0, 5)}...${newApiKey.substring(newApiKey.length - 5)}`);
  console.log('\nRestart the server for the changes to take effect:');
  console.log('1. Stop the current server (Ctrl+C)');
  console.log('2. Start it again: node server.js');
} catch (error) {
  console.error('Error updating API key:', error.message);
  process.exit(1);
} 