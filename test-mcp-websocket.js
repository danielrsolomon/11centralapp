// WebSocket test for the MCP server
const WebSocket = require('ws');

function connectToMcpWebSocket() {
  const ws = new WebSocket('ws://localhost:3100');
  
  ws.on('open', function open() {
    console.log('Connected to MCP WebSocket server!');
    
    // Try sending a list tables command
    const message = JSON.stringify({
      jsonrpc: '2.0',
      method: 'list_tables',
      params: {},
      id: Date.now()
    });
    
    console.log('Sending message:', message);
    ws.send(message);
    
    // Also try sending something in Cursor's format
    setTimeout(() => {
      const cursorMessage = JSON.stringify({
        prompt: "Show me all tables in the database",
        tools: [],
        id: Date.now().toString()
      });
      
      console.log('Sending Cursor-style message:', cursorMessage);
      ws.send(cursorMessage);
    }, 1000);
  });
  
  ws.on('message', function incoming(data) {
    console.log('Received message:', data.toString());
    try {
      const parsed = JSON.parse(data.toString());
      console.log('Parsed response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.error('Failed to parse response:', e.message);
    }
  });
  
  ws.on('error', function error(err) {
    console.error('WebSocket error:', err.message);
  });
  
  ws.on('close', function close() {
    console.log('Connection closed');
  });
  
  // Close the connection after 5 seconds
  setTimeout(() => {
    console.log('Closing connection...');
    ws.close();
  }, 5000);
}

console.log('Attempting to connect to MCP server via WebSocket...');
try {
  connectToMcpWebSocket();
} catch (err) {
  console.error('Failed to connect:', err.message);
} 