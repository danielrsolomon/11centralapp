// load_mcp.js
import fs from 'fs';
import path from 'path';

// Function to load MCP context from JSON file
export const loadMCP = () => {
  const mcpPath = path.join(process.cwd(), 'mcp_config.json');
  try {
    const mcpData = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
    console.log("🔹 MCP Loaded Successfully:", mcpData);
    return mcpData;
  } catch (error) {
    console.error('❌ Error loading MCP:', error);
    return null;
  }
};