import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

// Create Express server
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export the Express app
export default app; 