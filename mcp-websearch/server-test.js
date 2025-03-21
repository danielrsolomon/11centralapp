const express = require('express');
const axios = require('axios');
const app = express();
const port = 3101; // Using a different port for testing

app.use(express.json());

// Intentionally invalid API key for testing fallback
const BRAVE_API_KEY = 'INVALID-KEY-123';

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

// Endpoint for web search
app.post('/search', async (req, res) => {
  const query = req.body.query;
  
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  
  console.log(`[${req.currentDate}] Processing search request: "${query}"`);
  
  try {
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: { 
        q: query, 
        count: 10
      },
      headers: { 'X-Subscription-Token': BRAVE_API_KEY }
    });
    
    // Check if web results exist
    if (!response.data.web || !response.data.web.results) {
      // Create a mock response if Brave API doesn't return expected format
      console.log(`[${req.currentDate}] API returned unexpected format, creating mock response`);
      
      const mockResults = [
        {
          title: "Mock Result: " + query,
          url: "https://example.com/result",
          description: "This is a mock result for your query. The Brave Search API may not be returning the expected format or there might be API limitations.",
          published_date: new Date().toISOString()
        }
      ];
      
      return res.json({
        results: mockResults,
        query,
        timestamp: req.currentDate,
        message: "Mock results generated due to API response format issues"
      });
    }
    
    // Extract and format the search results
    const results = response.data.web.results.map(result => ({
      title: result.title,
      url: result.url,
      description: result.description || "No description available",
      published_date: result.published_date || 'Unknown date'
    }));
    
    console.log(`[${req.currentDate}] Search successful, found ${results.length} results`);
    
    res.json({ 
      results,
      query,
      timestamp: req.currentDate,
      message: "Results as of March 15, 2025" // For demonstration, showing the date from instructions
    });
  } catch (error) {
    console.error('Search error:', error.message);
    console.error('Error details:', error.response?.data || 'No detailed error info');
    
    // If the error is from the Brave API and it's a 422, it's likely an invalid parameter
    if (error.response && error.response.status === 422) {
      console.log('Trying fallback search with minimal parameters...');
      
      try {
        // Try a fallback request with minimal parameters
        const fallbackResponse = await axios.get('https://api.search.brave.com/res/v1/web/search', {
          params: { q: query },
          headers: { 'X-Subscription-Token': BRAVE_API_KEY }
        });
        
        // Process fallback results
        const fallbackResults = fallbackResponse.data.web?.results?.map(result => ({
          title: result.title,
          url: result.url,
          description: result.description || "No description available",
          published_date: result.published_date || 'Unknown date'
        })) || [];
        
        console.log(`[${req.currentDate}] Fallback search successful, found ${fallbackResults.length} results`);
        
        return res.json({
          results: fallbackResults,
          query,
          timestamp: req.currentDate,
          message: "Fallback results as of March 15, 2025"
        });
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError.message);
        
        // If fallback fails, provide mock results
        const mockResults = [
          {
            title: "Mock Result for: " + query,
            url: "https://example.com/search?q=" + encodeURIComponent(query),
            description: "This is a mock result due to Brave Search API issues. Please check your API key and the Brave Search API documentation.",
            published_date: new Date().toISOString()
          }
        ];
        
        return res.json({
          results: mockResults,
          query,
          timestamp: req.currentDate,
          message: "Mock results generated due to API issues"
        });
      }
    }
    
    // Provide helpful error messages based on the error type
    if (error.response && error.response.status === 401) {
      console.log(`[${req.currentDate}] API key error (401 Unauthorized)`);
      
      // Return mock results with a note about the API key issue
      const mockResults = [
        {
          title: "API Key Error Mock Result for: " + query,
          url: "https://example.com/search?q=" + encodeURIComponent(query),
          description: "This is a mock result due to an invalid API key. The Brave Search API returned a 401 Unauthorized error.",
          published_date: new Date().toISOString()
        }
      ];
      
      return res.json({
        results: mockResults,
        query,
        timestamp: req.currentDate,
        message: "Mock results generated due to API key issues (401 Unauthorized)"
      });
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      res.status(500).json({ 
        error: 'Network error. Please check your internet connection.' 
      });
    } else {
      res.status(500).json({ 
        error: 'Search failed. Details: ' + error.message,
        suggestion: 'If the error persists, please verify your API key or check the Brave Search API status.'
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'E11EVEN Web Search MCP Test Server',
    timestamp: req.currentDate,
    note: "Using intentionally invalid API key to test fallback"
  });
});

// Start the server
app.listen(port, () => {
  console.log(`
============================================================
  E11EVEN Web Search MCP Test Server (Invalid API Key)
============================================================
  Status: Running
  URL: http://localhost:${port}
  Endpoints:
    - POST /search - Search the web using Brave Search API
    - GET /health - Check server health
  
  Testing fallback behavior with invalid API key: ${BRAVE_API_KEY}
============================================================
  `);
}); 