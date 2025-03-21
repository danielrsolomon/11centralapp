import express from 'express';
import { asyncHandler, sendSuccess } from '../utils/route-helpers.js';

const router = express.Router();

/**
 * GET /api/health
 * 
 * Simple health check endpoint to verify the API server is running
 */
router.get('/', asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    status: 'ok',
    message: 'API server is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}));

export default router; 