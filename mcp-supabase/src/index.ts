import { MCPServer } from 'mcp-framework';
import { registerSupabaseTools } from './tools/supabase-tools.js';

async function main() {
  try {
    // Create a new MCP server
    const server = new MCPServer({
      name: 'e11even-central-mcp',
      version: '1.0.0',
      description: 'MCP Server for E11EVEN Central App',
    });
    
    // Register all Supabase tools
    registerSupabaseTools(server);
    
    // Start the server
    await server.start();
    console.log('E11EVEN Central MCP Server is running');
    console.log('Available tools:');
    
    // List registered tools
    server.getTools().forEach((tool) => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Run the server
main(); 