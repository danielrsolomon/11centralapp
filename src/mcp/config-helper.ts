import * as fs from 'fs';
import * as path from 'path';
import { createInterface } from 'readline';

// Function to interactively set Supabase credentials
export async function configureSupabase(): Promise<void> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('=== Supabase Configuration ===');
  console.log('This tool will help you configure your Supabase credentials for the MCP server.');
  console.log('You can find these credentials in your Supabase project settings > API.');
  console.log('');

  const prompt = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve));

  try {
    // Get the current values from .env file if it exists
    const envPath = path.resolve(process.cwd(), '.env');
    let currentEnv: Record<string, string> = {};
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      for (const line of envLines) {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          currentEnv[key.trim()] = value.trim();
        }
      }
    }

    // Get Supabase URL
    let supabaseUrl = currentEnv.SUPABASE_URL || '';
    const inputUrl = await prompt(`Supabase URL${supabaseUrl ? ` (current: ${supabaseUrl})` : ''}: `);
    if (inputUrl) {
      supabaseUrl = inputUrl;
    }

    // Get Supabase Key
    let supabaseKey = currentEnv.SUPABASE_KEY || '';
    const maskedKey = supabaseKey ? '********' : '';
    const inputKey = await prompt(`Supabase Key${maskedKey ? ` (current: ${maskedKey})` : ''}: `);
    if (inputKey) {
      supabaseKey = inputKey;
    }

    // Get MCP Port
    let mcpPort = currentEnv.MCP_PORT || '3100';
    const inputPort = await prompt(`MCP Port (current: ${mcpPort}): `);
    if (inputPort) {
      mcpPort = inputPort;
    }

    // Update .env file
    const envContent = `# Supabase credentials
SUPABASE_URL=${supabaseUrl}
SUPABASE_KEY=${supabaseKey}

# MCP Server configuration
MCP_PORT=${mcpPort}`;

    fs.writeFileSync(envPath, envContent);
    console.log('\n.env file updated successfully!');
    
    // Update cursor/mcp.json
    const mcpJsonPath = path.resolve(process.cwd(), 'cursor/mcp.json');
    if (fs.existsSync(mcpJsonPath)) {
      const mcpJson = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf8'));
      
      if (mcpJson.mcpServers && mcpJson.mcpServers['e11even-mcp']) {
        mcpJson.mcpServers['e11even-mcp'].env = {
          SUPABASE_URL: supabaseUrl,
          SUPABASE_KEY: supabaseKey,
          MCP_PORT: mcpPort
        };
        
        fs.writeFileSync(mcpJsonPath, JSON.stringify(mcpJson, null, 2));
        console.log('cursor/mcp.json updated successfully!');
      }
    }
  } catch (error) {
    console.error('Error configuring Supabase:', error);
  } finally {
    rl.close();
  }
}

// If this script is run directly, execute the configuration
if (require.main === module) {
  configureSupabase();
} 