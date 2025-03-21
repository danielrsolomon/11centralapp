# E11EVEN Web Search MCP Server

This is a Model Context Protocol (MCP) server that enables web search capabilities for Claude 3.7 Sonnet in Cursor.ai using the Brave Search API.

## Features

- Real-time web search integration with the Brave Search API
- Comprehensive error handling with intelligent fallback mechanisms
- Domain-specific enhanced mock results when API issues occur
- Response time tracking and detailed logging
- Easy API key management
- Seamless integration with Cursor.ai and Claude 3.7 Sonnet

## Setup Instructions

### Prerequisites

- Node.js v14 or higher
- Cursor.ai with Claude 3.7 Sonnet integration
- Brave Search API key (configured in server.js)

### Starting the Server

1. Open a terminal and navigate to the `mcp-websearch` directory:
   ```bash
   cd /path/to/mcp-websearch
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. You should see a message indicating the server is running on port 3100.

### API Key Validation

Before using the MCP for searches, verify that your API key is working:

1. Access the API key test endpoint:
   ```bash
   curl -X GET http://localhost:3100/test-api-key
   ```

2. If the response indicates an error with the API key, update it using the provided script:
   ```bash
   node update-api-key.js YOUR_NEW_API_KEY
   ```

## Usage

To use the web search capability in Cursor.ai:

1. Make sure the MCP server is running
2. In Cursor.ai, use the following syntax to search the web:

```
@web-search query="your search query here"
```

For example:
```
@web-search query="latest AI news March 2025"
```

### Example Queries

The following queries have been tested and work well:
- `@web-search query="latest AI news March 2025"`
- `@web-search query="NVIDIA GTC 2025 announcements"`
- `@web-search query="AI stock market trends March 2025"`
- `@web-search query="technology trends March 2025"`

## Response Format

The MCP server returns search results in a standardized format:

```json
{
  "results": [
    {
      "title": "Result Title",
      "url": "https://example.com/result",
      "description": "Result description text...",
      "published_date": "2025-03-15T00:00:00Z"
    }
  ],
  "query": "your search query",
  "timestamp": "March 15, 2025 at 05:47 PM",
  "response_time": 625,
  "message": "Results from Brave Search API as of March 15, 2025",
  "is_mock": false
}
```

## Brave Search API Integration

The server integrates with the Brave Search API with the following configurations:

- Endpoint: `https://api.search.brave.com/res/v1/web/search`
- Default parameters:
  - `count`: 5 results per query
  - `safesearch`: moderate
  - `text_format`: plain
  - `wait_for_freshness`: false
- Headers:
  - `Accept`: application/json
  - `X-Subscription-Token`: Your API key
  - `User-Agent`: E11EVEN-Web-Search-MCP/1.0.0

### Fallback Mechanism

If the Brave Search API encounters issues, the server follows this fallback strategy:

1. First attempts with standard parameters
2. If that fails with a 422 error, tries with minimal parameters (just the query)
3. If both fail, generates domain-specific mock results based on the query

## Maintenance Scripts

The following scripts are available to help maintain and improve the MCP server:

### Update API Key

If you need to update the Brave Search API key:

```bash
node update-api-key.js YOUR_NEW_API_KEY
```

This script will update the API key in the server.js file and display the old and new keys for verification.

### Enhance Mock Results

The mock results have been enhanced with domain-specific information for common query types, making the fallback mechanism more useful. This is now integrated directly into the server.js file.

## Testing and Validation

A comprehensive testing log is available in the `TESTING_LOG.md` file. This log includes:

- API troubleshooting summary
- Issues identified and fixes implemented
- Detailed test results for all endpoints
- Performance metrics
- Current status and recommendations

## Troubleshooting

### API Key Issues

If you encounter issues with the Brave Search API key:

1. Use the `/test-api-key` endpoint to diagnose API key problems
2. Check the terminal where the MCP server is running for detailed error messages
3. If needed, regenerate a new API key from the [Brave Search API Dashboard](https://brave.com/search/api)
4. Use the `update-api-key.js` script to update the key in the server.js file

### 422 Validation Errors

If you see 422 errors in the logs:

1. Check that the API request format matches the latest Brave Search API requirements
2. Verify that all required parameters are included (q, safesearch, etc.)
3. Ensure all headers are properly set

### Rate Limiting (429 Errors)

If you encounter 429 errors:

1. Wait a few minutes before retrying
2. Consider reducing the frequency of queries
3. Check your API usage dashboard at [Brave Search API](https://brave.com/search/api)

## Performance

- Average response time with real API results: ~625ms
- Average response time with mock results: ~230ms
- All responses include timing information in the `response_time` field

## Status

Setup complete! The Web Search MCP is fully functional with real Brave Search API data as of March 15, 2025, 05:47 PM EDT.

## License

ISC License 