import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import usersRouter from './users';
import rolesRouter from './roles';
import settingsRouter from './settings';
import logsRouter from './logs';
import schemaRouter from './schema';
import usersRolesRouter from './users-roles';

const router = Router();

/**
 * @route GET /api/admin
 * @desc Root route for admin module, provides module info and available endpoints
 * @access Public
 */
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  res.json({
    name: 'Admin Module',
    description: 'Administrative functionality for managing users, roles, settings, and monitoring system activity',
    endpoints: {
      '/api/admin/users': 'User management',
      '/api/admin/roles': 'Role management',
      '/api/admin/users-roles': 'User role management',
      '/api/admin/settings': 'System configuration settings',
      '/api/admin/activity': 'System activity logs'
    }
  });
});

// Mount the sub-routes
router.use('/users', usersRouter);
router.use('/roles', rolesRouter);
router.use('/users-roles', usersRolesRouter);
router.use('/settings', settingsRouter);
router.use('/logs', logsRouter);
router.use('/schema', schemaRouter);

export default router; 