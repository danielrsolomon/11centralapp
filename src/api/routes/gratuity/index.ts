import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import tipsRouter from './tips';
import paymentsRouter from './payments';
import statsRouter from './stats';

const router = Router();

/**
 * @route GET /api/gratuity
 * @desc Root route for gratuity module, provides module info and available endpoints
 * @access Public
 */
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  res.json({
    module: 'Gratuity',
    description: 'API endpoints for managing tips and gratuities',
    version: '1.0.0',
    endpoints: {
      '/api/gratuity/tips': 'Tip management',
      '/api/gratuity/payment-session': 'Payment processing for tips',
      '/api/gratuity/stats': 'Statistics and reporting'
    }
  });
});

// Mount the sub-routes
router.use('/tips', tipsRouter);
router.use('/payment-session', paymentsRouter);
router.use('/stats', statsRouter);

export default router; 