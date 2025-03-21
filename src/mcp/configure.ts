import { configureSupabase } from './config-helper';

// Run the configuration helper
configureSupabase().then(() => {
  console.log('Configuration complete!');
  console.log('You can now run the MCP server with:');
  console.log('  npx ts-node src/mcp/index.ts');
}); 