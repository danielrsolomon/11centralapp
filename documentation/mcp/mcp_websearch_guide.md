# E11EVEN Central App - Web Search MCP Guide

*Last Updated: March 16, 2025*

## Introduction

This document provides a comprehensive guide to the Web Search Model Context Protocol (MCP) integration for the E11EVEN Central App. The Web Search MCP enables Claude 3.7 Sonnet in Cursor.ai to perform web searches using the Brave Search API, enhancing productivity by providing real-time access to current information without leaving the coding environment.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Setup Instructions](#setup-instructions)
   - [Prerequisites](#prerequisites)
   - [Installation](#installation)
   - [API Key Configuration](#api-key-configuration)
5. [Usage Guide](#usage-guide)
   - [Basic Search](#basic-search)
   - [Example Queries](#example-queries)
   - [Response Format](#response-format)
6. [Brave Search API Integration](#brave-search-api-integration)
   - [API Configuration](#api-configuration)
   - [Fallback Mechanism](#fallback-mechanism)
7. [Maintenance](#maintenance)
   - [API Key Management](#api-key-management)
   - [Enhanced Mock Results](#enhanced-mock-results)
   - [Performance Monitoring](#performance-monitoring)
8. [Troubleshooting](#troubleshooting)
   - [API Key Issues](#api-key-issues)
   - [Validation Errors](#validation-errors)
   - [Rate Limiting](#rate-limiting)
9. [Technical Details](#technical-details)
   - [Server Implementation](#server-implementation)
   - [Error Handling](#error-handling)
   - [Logging System](#logging-system)
10. [Future Enhancements](#future-enhancements)

## Overview

The Web Search MCP server acts as a bridge between Cursor.ai and the Brave Search API, allowing Claude 3.7 Sonnet to access up-to-date information from the web. This integration enables developers to perform research, fact-checking, and stay informed on latest developments without context switching from their coding environment.

## Architecture

The Web Search MCP follows a simple client-server architecture:

1. **Client Side**: Claude 3.7 Sonnet in Cursor.ai sends search queries using the `@web-search` command
2. **MCP Server**: Listens on port 3100 and processes search requests
3. **External API**: The server communicates with the Brave Search API to retrieve web results
4. **Response Handling**: Results are formatted and returned to Claude for context

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────┐
│  Cursor.ai  │────▶│  Web Search MCP  │────▶│  Brave Search │
│ with Claude │◀────│     Server       │◀────│      API      │
└─────────────┘     └──────────────────┘     └───────────────┘
```

## Features

- **Real-time Web Search**: Access current information directly from Cursor.ai
- **Robust Error Handling**: Comprehensive error handling with intelligent fallback mechanisms
- **Domain-specific Mock Results**: Enhanced mock results when API issues occur
- **Performance Monitoring**: Response time tracking and detailed logging
- **API Key Management**: Easy API key validation and updating
- **Seamless Integration**: Works natively with Claude 3.7 Sonnet in Cursor.ai

## Setup Instructions

### Prerequisites

- Node.js v14 or higher
- Cursor.ai with Claude 3.7 Sonnet integration
- Brave Search API key (obtain from [Brave Search API](https://brave.com/search/api))

### Installation

1. Navigate to the `mcp-websearch` directory:
   ```bash
   cd /path/to/mcp-websearch
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

   Alternatively, you can use the provided scripts:
   ```bash
   ./start-websearch-mcp.sh
   ```

4. Verify the server is running:
   ```bash
   curl -X GET http://localhost:3100/health
   ```

### API Key Configuration

The server uses a Brave Search API key configured in `server.js`. To validate or update this key:

1. Test the current API key:
   ```bash
   curl -X GET http://localhost:3100/test-api-key
   ```

2. If the key is invalid or needs updating, use the provided script:
   ```bash
   node update-api-key.js YOUR_NEW_API_KEY
   ```

## Usage Guide

### Basic Search

To perform a web search in Cursor.ai:

1. Make sure the MCP server is running
2. In Cursor.ai's chat panel, use the following syntax:

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

### Response Format

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
  "timestamp": "March 16, 2025 at 05:47 PM",
  "response_time": 625,
  "message": "Results from Brave Search API as of March 16, 2025",
  "is_mock": false
}
```

## Brave Search API Integration

### API Configuration

The server integrates with the Brave Search API with the following configurations:

- **Endpoint**: `https://api.search.brave.com/res/v1/web/search`
- **Default Parameters**:
  - `count`: 5 results per query
  - `safesearch`: moderate
  - `text_format`: plain
  - `wait_for_freshness`: false
- **Headers**:
  - `Accept`: application/json
  - `X-Subscription-Token`: Your API key
  - `User-Agent`: E11EVEN-Web-Search-MCP/1.0.0

### Fallback Mechanism

If the Brave Search API encounters issues, the server follows this fallback strategy:

1. First attempts with standard parameters
2. If that fails with a 422 error, tries with minimal parameters (just the query)
3. If both fail, generates domain-specific mock results based on the query type

The mock results are categorized by domain:
- AI news and advancements
- Technology trends
- NVIDIA GTC specific information
- Stock market trends
- Default generic results

## Maintenance

### API Key Management

For security and reliability, it's recommended to regularly update the Brave Search API key:

```bash
node update-api-key.js YOUR_NEW_API_KEY
```

This script will:
1. Validate the new key format
2. Update the key in server.js
3. Display the old and new keys (partially masked) for verification
4. Provide instructions for restarting the server

### Enhanced Mock Results

The mock results system is directly integrated into the server and provides domain-specific information for common query types. This ensures useful responses even when the API is unavailable.

The system categorizes queries based on keywords and returns relevant mock results, making the fallback mechanism more useful for users.

### Performance Monitoring

The server includes comprehensive performance monitoring:

- Response time tracking for all API requests
- Detailed logging of API responses and errors
- Performance statistics included in response objects

Typical performance metrics:
- Average response time with real API: ~625ms
- Average response time with mock results: ~230ms

## Troubleshooting

### API Key Issues

If you encounter issues with the Brave Search API key:

1. Use the `/test-api-key` endpoint to diagnose API key problems:
   ```bash
   curl -X GET http://localhost:3100/test-api-key
   ```

2. Check the terminal where the MCP server is running for detailed error messages

3. If needed, regenerate a new API key from the [Brave Search API Dashboard](https://brave.com/search/api)

4. Use the `update-api-key.js` script to update the key

### Validation Errors

If you see 422 errors (Unprocessable Entity) in the logs:

1. Check that the API request format matches the latest Brave Search API requirements
2. Verify that all required parameters are included (q, safesearch, etc.)
3. Ensure all headers are properly set
4. Try using the simplified fallback mechanism by modifying request parameters

### Rate Limiting

If you encounter 429 errors (Too Many Requests):

1. Wait a few minutes before retrying
2. Consider reducing the frequency of queries
3. Check your API usage dashboard at [Brave Search API](https://brave.com/search/api)
4. Implement request limiting or throttling on the client side

## Technical Details

### Server Implementation

The Web Search MCP server is built with:

- **Express.js**: For the HTTP server and routing
- **Axios**: For making API requests to the Brave Search API
- **Node.js**: As the runtime environment

The server handles CORS, JSON parsing, and error management with middleware.

### Error Handling

The server implements a comprehensive error handling strategy:

1. **Validation Middleware**: Checks for required parameters before processing
2. **Try-Catch Blocks**: Surrounds all asynchronous API calls
3. **Status-specific Handlers**: Different strategies for 422, 401, and 429 errors
4. **Fallback Chain**: Multiple fallback options ensure responses even in error cases

### Logging System

The logging system records:

- Detailed request information
- API response data and headers
- Error details with request configuration
- Performance metrics for each request
- Server startup and configuration details

## Future Enhancements

Planned improvements to the Web Search MCP:

1. **Response Caching**: Implement a caching layer for frequent queries
2. **Advanced Query Options**: Support for filtering by date, region, language
3. **Result Enrichment**: Add related searches, image results, and news results
4. **Analytics Dashboard**: Web interface for monitoring usage and performance
5. **Multiple Search Providers**: Fallback to alternative search APIs when needed 