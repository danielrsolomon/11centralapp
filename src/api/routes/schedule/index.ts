import { Router } from 'express';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import appointmentsRoutes from './appointments';
import availabilityRoutes from './availability';
import servicesRoutes from './services';

const router = Router();

// Root route with module information
router.get('/', (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    name: 'Schedule Module',
    description: 'Appointment scheduling and provider availability management',
    endpoints: [
      '/api/schedule/appointments',
      '/api/schedule/availability',
      '/api/schedule/services'
    ]
  });
});

// Mount sub-routes
router.use('/appointments', appointmentsRoutes);
router.use('/availability', availabilityRoutes);
router.use('/services', servicesRoutes);

export default router; 