const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const port = 8100; // Updated from 3100 to 8100 for consistency with port numbering scheme

app.use(express.json());

// Use the provided Brave Search API key
const BRAVE_API_KEY = 'BSA7OX87zwMNti3n1C4eYFUsNOlxPEF';

// Brave Search API configuration
const BRAVE_API_CONFIG = {
  baseURL: 'https://api.search.brave.com/res/v1/web/search',
  defaultParams: {
    count: 5,  // Reduced from 10 to minimize chance of hitting rate limits
    safesearch: 'moderate',
    text_format: 'plain',
    wait_for_freshness: false, // Don't wait for fresh results to avoid timeouts
  },
  headers: {
    'Accept': 'application/json',
    'X-Subscription-Token': BRAVE_API_KEY,
    'User-Agent': 'E11EVEN-Web-Search-MCP/1.0.0'
  }
};

// Validation middleware to check if the API key is configured
app.use((req, res, next) => {
  if (!BRAVE_API_KEY || BRAVE_API_KEY.trim() === '') {
    return res.status(400).json({ 
      error: 'Missing Brave Search API key. Please add your key to the server.js file.' 
    });
  }
  next();
});

// Current date middleware - adds current date information to the response
app.use((req, res, next) => {
  req.currentDate = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  next();
});

// Domain-specific mock results for common query types
const getMockResults = (query) => {
  // Convert query to lowercase for easier matching
  const lowerQuery = query.toLowerCase();
  
  // AI news and advancements
  if (lowerQuery.includes('ai') && (lowerQuery.includes('news') || lowerQuery.includes('advancement'))) {
    return [
      {
        title: "NVIDIA Announces New AI Supercomputer at GTC 2025",
        url: "https://example.com/nvidia-gtc-2025",
        description: "NVIDIA unveiled its next-generation AI supercomputer at GTC 2025, featuring 10x performance improvements for large language model training and inference.",
        published_date: "2025-03-14T00:00:00Z"
      },
      {
        title: "WHO Releases Global AI Health Governance Framework",
        url: "https://example.com/who-ai-framework-2025",
        description: "The World Health Organization has published a comprehensive framework for AI governance in healthcare, addressing ethical concerns and regulatory standards.",
        published_date: "2025-03-10T00:00:00Z"
      },
      {
        title: "AI Breakthrough Enables Real-Time Language Translation with 99% Accuracy",
        url: "https://example.com/ai-translation-breakthrough",
        description: "Researchers have developed a new neural architecture that achieves near-perfect real-time translation across 95 languages with minimal computational resources.",
        published_date: "2025-03-12T00:00:00Z"
      }
    ];
  }
  
  // Technology trends
  if (lowerQuery.includes('technology') && lowerQuery.includes('trend')) {
    return [
      {
        title: "Top 10 Technology Trends Reshaping Industries in 2025",
        url: "https://example.com/tech-trends-2025",
        description: "From quantum computing to brain-computer interfaces, these technologies are transforming how businesses operate and how consumers interact with digital services.",
        published_date: "2025-03-15T00:00:00Z"
      },
      {
        title: "Sustainable Tech: The Fastest Growing Sector in Q1 2025",
        url: "https://example.com/sustainable-tech-growth",
        description: "Environmental technology solutions have seen unprecedented investment in early 2025, with carbon capture and green energy storage leading the market.",
        published_date: "2025-03-08T00:00:00Z"
      },
      {
        title: "Digital Privacy Revolution: How New Regulations Are Changing Tech",
        url: "https://example.com/privacy-tech-changes",
        description: "The implementation of global privacy standards is forcing technology companies to fundamentally rethink data collection and processing practices.",
        published_date: "2025-03-05T00:00:00Z"
      }
    ];
  }
  
  // NVIDIA GTC specific mock results
  if (lowerQuery.includes('nvidia') && lowerQuery.includes('gtc')) {
    return [
      {
        title: "NVIDIA GTC 2025: Everything Announced at the GPU Technology Conference",
        url: "https://example.com/nvidia-gtc-2025-announcements",
        description: "NVIDIA's annual GPU Technology Conference showcased breakthrough AI hardware, next-gen graphics cards, and autonomous vehicle advancements for 2025.",
        published_date: "2025-03-17T00:00:00Z"
      },
      {
        title: "NVIDIA Unveils Hopper H200 GPUs at GTC 2025",
        url: "https://example.com/nvidia-h200-announcement",
        description: "The new Hopper H200 GPUs deliver 2x performance compared to previous generation for AI training and inference workloads.",
        published_date: "2025-03-17T00:00:00Z"
      },
      {
        title: "NVIDIA Stock Surges 15% Following GTC 2025 Announcements",
        url: "https://example.com/nvidia-stock-gtc-2025",
        description: "Investors responded positively to NVIDIA's showcase of new AI technologies and expanded cloud partnerships announced at GTC 2025.",
        published_date: "2025-03-18T00:00:00Z"
      }
    ];
  }
  
  // Stock market trends
  if ((lowerQuery.includes('stock') || lowerQuery.includes('market')) && lowerQuery.includes('trend')) {
    return [
      {
        title: "AI Stocks Lead Market Gains in Q1 2025",
        url: "https://example.com/ai-stocks-q1-2025",
        description: "Artificial intelligence companies have outperformed broader market indices by 34% in the first quarter, driven by enterprise adoption and new consumer applications.",
        published_date: "2025-03-15T00:00:00Z"
      },
      {
        title: "Federal Reserve Policy Shifts Impact Technology Stocks in March 2025",
        url: "https://example.com/fed-policy-tech-stocks-2025",
        description: "The Federal Reserve's new approach to interest rates has created volatility in high-growth technology stocks while benefiting established firms with strong cash positions.",
        published_date: "2025-03-14T00:00:00Z"
      },
      {
        title: "Market Analysts Release Q2 2025 Forecasts: AI and Green Energy Lead",
        url: "https://example.com/q2-2025-market-forecasts",
        description: "Top financial institutions predict continued strength in AI infrastructure companies and renewable energy sectors heading into Q2 2025.",
        published_date: "2025-03-12T00:00:00Z"
      }
    ];
  }
  
  // Default mock results for other queries
  return [
    {
      title: "Mock Result for: " + query,
      url: "https://example.com/search?q=" + encodeURIComponent(query),
      description: "This is a mock result due to Brave Search API issues. The query was about: " + query,
      published_date: new Date().toISOString()
    },
    {
      title: "Additional Information on: " + query,
      url: "https://example.com/info?topic=" + encodeURIComponent(query),
      description: "More context about this topic based on recent developments as of March 2025.",
      published_date: new Date().toISOString()
    }
  ];
};

// Function to log API response details for debugging
const logApiResponse = (response, query) => {
  console.log(`[${new Date().toISOString()}] API Response for query "${query}":
  Status: ${response.status}
  Headers: ${JSON.stringify(response.headers)}
  Data Sample: ${JSON.stringify(response.data).substring(0, 300)}...`);
};

// Function to log API error details for debugging
const logApiError = (error, query) => {
  console.error(`[${new Date().toISOString()}] API Error for query "${query}":`);
  if (error.response) {
    // Server responded with non-2xx status
    console.error(`  Status: ${error.response.status}`);
    console.error(`  Headers: ${JSON.stringify(error.response.headers)}`);
    console.error(`  Data: ${JSON.stringify(error.response.data)}`);
  } else if (error.request) {
    // Request was made but no response received
    console.error(`  No response received. Request: ${JSON.stringify(error.request)}`);
  } else {
    // Error during request setup
    console.error(`  Error setting up request: ${error.message}`);
  }
  if (error.config) {
    console.error(`  Request Config: 
    URL: ${error.config.url}
    Method: ${error.config.method}
    Headers: ${JSON.stringify(error.config.headers)}
    Params: ${JSON.stringify(error.config.params)}`);
  }
};

// Endpoint for web search
app.post('/search', async (req, res) => {
  const query = req.body.query;
  
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  
  console.log(`[${req.currentDate}] Processing search request: "${query}"`);
  
  // Track API request start time for performance monitoring
  const startTime = Date.now();
  
  try {
    // Make API request with the most basic parameters possible to avoid validation errors
    const response = await axios({
      method: 'get',
      url: BRAVE_API_CONFIG.baseURL,
      headers: BRAVE_API_CONFIG.headers,
      params: {
        q: query,
        ...BRAVE_API_CONFIG.defaultParams
      }
    });
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    console.log(`[${req.currentDate}] Brave Search API responded in ${responseTime}ms`);
    
    // Log API response for debugging
    logApiResponse(response, query);
    
    // Check if web results exist and are properly formatted
    if (!response.data.web || !Array.isArray(response.data.web.results) || response.data.web.results.length === 0) {
      console.log(`[${req.currentDate}] API returned empty or unexpected format, creating mock response`);
      
      return res.json({
        results: getMockResults(query),
        query,
        timestamp: req.currentDate,
        response_time: responseTime,
        message: "Mock results generated due to API response format issues",
        is_mock: true
      });
    }
    
    // Extract and format the search results
    const results = response.data.web.results.map(result => ({
      title: result.title,
      url: result.url,
      description: result.description || "No description available",
      published_date: result.published_date || 'Unknown date'
    }));
    
    console.log(`[${req.currentDate}] Search successful, found ${results.length} results in ${responseTime}ms`);
    
    // Return the real search results
    return res.json({ 
      results,
      query,
      timestamp: req.currentDate,
      response_time: responseTime,
      message: "Results from Brave Search API as of March 15, 2025",
      is_mock: false
    });
  } catch (error) {
    // Calculate response time even for errors
    const responseTime = Date.now() - startTime;
    
    // Log detailed error information
    logApiError(error, query);
    
    // Handle specific error types
    if (error.response) {
      const status = error.response.status;
      
      // Handle validation errors (422)
      if (status === 422) {
        console.log(`[${req.currentDate}] API validation error (422). Trying simplified query...`);
        
        try {
          // Try a more simplified request with just the query parameter
          const fallbackResponse = await axios({
            method: 'get',
            url: BRAVE_API_CONFIG.baseURL,
            headers: BRAVE_API_CONFIG.headers,
            params: { q: query }
          });
          
          // Log fallback response
          logApiResponse(fallbackResponse, query);
          
          // Process fallback results if available
          if (fallbackResponse.data.web && Array.isArray(fallbackResponse.data.web.results) && fallbackResponse.data.web.results.length > 0) {
            const fallbackResults = fallbackResponse.data.web.results.map(result => ({
              title: result.title,
              url: result.url,
              description: result.description || "No description available",
              published_date: result.published_date || 'Unknown date'
            }));
            
            console.log(`[${req.currentDate}] Fallback search successful, found ${fallbackResults.length} results in ${Date.now() - startTime}ms`);
            
            return res.json({
              results: fallbackResults,
              query,
              timestamp: req.currentDate,
              response_time: Date.now() - startTime,
              message: "Results from simplified Brave Search API query as of March 15, 2025",
              is_mock: false
            });
          }
        } catch (fallbackError) {
          console.error(`[${req.currentDate}] Fallback search also failed:`, fallbackError.message);
          logApiError(fallbackError, query);
        }
      }
      
      // Handle unauthorized errors (401)
      else if (status === 401) {
        console.error(`[${req.currentDate}] Authentication error (401). Check API key.`);
      }
      
      // Handle rate limiting (429)
      else if (status === 429) {
        console.error(`[${req.currentDate}] Rate limit exceeded (429). Please try again later.`);
      }
    }
    
    // Provide mock results as fallback
    const mockResults = getMockResults(query);
    
    console.log(`[${req.currentDate}] Returning mock results after API failure`);
    
    return res.json({
      results: mockResults,
      query,
      timestamp: req.currentDate,
      response_time: responseTime,
      message: "Mock results generated due to Brave Search API issues: " + (error.message || "Unknown error"),
      error_details: error.response ? `Status: ${error.response.status}, ${JSON.stringify(error.response.data)}` : error.message,
      is_mock: true
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'E11EVEN Web Search MCP',
    timestamp: req.currentDate,
    api_key_configured: BRAVE_API_KEY ? 'Yes (Masked)' : 'No',
    api_endpoint: BRAVE_API_CONFIG.baseURL
  });
});

// Endpoint to test API key validity without performing a search
app.get('/test-api-key', async (req, res) => {
  console.log(`[${req.currentDate}] Testing API key validity`);
  
  try {
    // Use a simple test query to check if the API key works
    const response = await axios({
      method: 'get',
      url: BRAVE_API_CONFIG.baseURL,
      headers: BRAVE_API_CONFIG.headers,
      params: { q: 'test', count: 1 }
    });
    
    // If we get here, the request was successful
    res.json({
      status: 'OK',
      message: 'API key is valid',
      details: {
        status: response.status,
        results_count: response.data.web?.results?.length || 0
      }
    });
  } catch (error) {
    // Log detailed error information
    logApiError(error, 'test');
    
    // Return error details
    res.status(error.response?.status || 500).json({
      status: 'ERROR',
      message: 'API key validation failed',
      error: error.response?.data || error.message,
      status_code: error.response?.status,
      recommendation: error.response?.status === 401 ? 'API key is invalid. Please generate a new key at https://brave.com/search/api' : 'Check your network connection and Brave Search API status'
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`
============================================================
  E11EVEN Web Search MCP Server (Updated: March 16, 2025)
============================================================
  Status: Running
  URL: http://localhost:${port}
  API Endpoint: ${BRAVE_API_CONFIG.baseURL}
  Endpoints:
    - POST /search - Search the web using Brave Search API
    - GET /health - Check server health
    - GET /test-api-key - Test if the API key is valid
  
  To test: 
  curl -X POST http://localhost:${port}/search \\
       -H "Content-Type: application/json" \\
       -d '{"query":"latest AI news"}'
       
  In Cursor.ai: Use @web-search query="latest AI news"
============================================================
  `);
}); 