import { Router } from 'express';
import { Request, Response } from 'express';
import universityRoutes from './university/index.js';
import chatRoutes from './chat/index.js';
import scheduleRoutes from './schedule/index.js';
import gratuityRoutes from './gratuity/index.js';
import adminRoutes from './admin/index.js';
import authRoutes from './auth.js';
import { errorHandler, notFoundHandler } from '../middleware/error-handler.js';

// Import route modules
// We'll add these as we create them
// import universityRoutes from './university';
// import chatRoutes from './chat';
// import scheduleRoutes from './schedule';
// import gratuityRoutes from './gratuity';
// import adminRoutes from './admin';
// import authRoutes from './auth';

const router = Router();

// Root route with API information
router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'E11EVEN Central API',
    version: '1.0.0',
    description: 'API for E11EVEN Central application',
    endpoints: [
      '/api/university',
      '/api/chat',
      '/api/schedule',
      '/api/gratuity',
      '/api/admin',
      '/api/auth'
    ]
  });
});

// Health check endpoint
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      message: 'API server is running',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }
  });
});

// Mount routes
router.use('/university', universityRoutes);
router.use('/chat', chatRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/gratuity', gratuityRoutes);
router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);

// Handle 404 - must be after all routes
router.use(notFoundHandler);

// Error handling middleware - must be last
router.use(errorHandler);

export default router; 