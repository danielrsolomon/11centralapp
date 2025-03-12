import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import logger from '@/lib/logger';
import { 
  hasAdminRole, 
  hasManagerRole, 
  canCreateContent, 
  canEditContent, 
  canDeleteContent,
  ADMIN_ROLES
} from '@/lib/auth/permission-utils';

/**
 * Type for user permissions
 */
export interface UserPermissions {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isManager: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canView: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to check and manage user permissions
 * 
 * @returns User permission information and status
 */
export function useUserPermissions(): UserPermissions {
  const [permissions, setPermissions] = useState<UserPermissions>({
    isAdmin: false,
    isSuperAdmin: false,
    isManager: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canView: true,
    loading: true,
    error: null
  });

  const router = useRouter();

  useEffect(() => {
    /**
     * Fetch user permissions from the server
     */
    async function fetchUserPermissions() {
      try {
        // First, check if user is authenticated
        const userResponse = await fetch('/api/auth/me');

        // If not authenticated, redirect to login
        if (!userResponse.ok) {
          logger.debug('User not authenticated, redirecting to login');
          router.push('/auth/login');
          return;
        }

        // Get user data
        const userData = await userResponse.json();

        // If we received an error but with 200 status (our graceful error handling)
        if (userData.error && userData.user_exists) {
          // We can still proceed with minimal permissions
          logger.warn('Received error from /api/auth/me but user exists', { 
            error: userData.error 
          });
          
          // Use defaults or provided permissions
          setPermissions({
            isAdmin: userData.permissions?.is_admin || false,
            isSuperAdmin: userData.permissions?.is_superadmin || false,
            isManager: userData.permissions?.is_manager || false,
            canCreate: userData.permissions?.can_create || false,
            canUpdate: userData.permissions?.can_update || false,
            canDelete: userData.permissions?.can_delete || false,
            canView: userData.permissions?.can_view || true,
            loading: false,
            error: userData.error
          });
          return;
        }

        // Use centralized permission utilities for consistent checking
        const isAdmin = hasAdminRole(userData);
        
        // Determine if user is superadmin specifically (case-insensitive check)
        const userRole = String(userData.role || '').toLowerCase();
        const isSuperAdmin = userRole === 'superadmin';
        
        const isManager = hasManagerRole(userData);

        // Update permissions state
        setPermissions({
          isAdmin,
          isSuperAdmin,
          isManager,
          canCreate: canCreateContent(userData), // Will be true for superadmin via hasAdminRole
          canUpdate: canEditContent(userData),   // Will be true for superadmin via hasAdminRole
          canDelete: canDeleteContent(userData), // Will be true for superadmin via hasAdminRole
          canView: true, // Everyone can view content they have access to
          loading: false,
          error: null
        });

        logger.debug('User permissions loaded', {
          isAdmin,
          isSuperAdmin,
          isManager,
          role: userData.role,
          canCreate: canCreateContent(userData)
        });
      } catch (error) {
        logger.error('Error loading user permissions', error as Error);

        // Set error state but allow viewing
        setPermissions({
          isAdmin: false,
          isSuperAdmin: false,
          isManager: false,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canView: true,
          loading: false,
          error: 'Error loading permissions'
        });
      }
    }

    fetchUserPermissions();
  }, [router]);

  return permissions;
}