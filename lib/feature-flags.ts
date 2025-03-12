/**
 * Feature Flag System for E11EVEN Central Platform
 * 
 * This module provides functionality to control the gradual rollout
 * of new service implementations and features.
 */

// Define all feature flag names as a union type for type safety
export type FeatureFlag = 
  | 'use-new-lms-services'        // Controls whether to use the new service implementations for LMS
  | 'use-new-progress-tracking'   // Controls whether to use the new progress tracking implementation
  | 'use-new-quiz-system'         // Controls whether to use the new quiz system implementation
  | 'use-new-database-clients'    // Controls whether to use the new database client factory
  | 'use-service-monitoring';     // Controls whether to enable service performance monitoring

// Feature flag check context
export interface FeatureFlagContext {
  userId?: string;
  userEmail?: string;
  userRoles?: string[];
  departmentId?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isTestEnvironment?: boolean;
}

/**
 * Check if a feature flag is enabled
 * 
 * @param flag The feature flag to check
 * @param context Context information to determine if the flag should be enabled
 * @returns boolean indicating if the feature is enabled
 */
export function isFeatureEnabled(
  flag: FeatureFlag, 
  context: FeatureFlagContext = {}
): boolean {
  // In development environment, allow enabling features via localStorage or env vars
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    try {
      // Check localStorage first for developer override
      const localStorageFlag = localStorage.getItem(`feature_${flag}`);
      if (localStorageFlag === 'true') return true;
      if (localStorageFlag === 'false') return false;
    } catch (e) {
      // Ignore localStorage errors (e.g., in SSR context)
    }
  }

  // Environment variable override (for both client and server)
  const envVarName = `NEXT_PUBLIC_FEATURE_${flag.replace(/-/g, '_').toUpperCase()}`;
  if (process.env[envVarName] === 'true') return true;
  if (process.env[envVarName] === 'false') return false;

  // Check for user-specific enabling
  if (context.userId) {
    const enabledUserIds = process.env[`NEXT_PUBLIC_FEATURE_${flag.replace(/-/g, '_').toUpperCase()}_USERS`]?.split(',') || [];
    if (enabledUserIds.includes(context.userId)) return true;
  }

  // Check for email pattern matching (e.g., enable for all @e11even.com emails)
  if (context.userEmail) {
    const enabledEmailPatterns = process.env[`NEXT_PUBLIC_FEATURE_${flag.replace(/-/g, '_').toUpperCase()}_EMAILS`]?.split(',') || [];
    if (enabledEmailPatterns.some(pattern => context.userEmail?.endsWith(pattern))) return true;
  }

  // Check for role-based enabling
  if (context.userRoles?.length) {
    const enabledRoles = process.env[`NEXT_PUBLIC_FEATURE_${flag.replace(/-/g, '_').toUpperCase()}_ROLES`]?.split(',') || [];
    if (context.userRoles.some(role => enabledRoles.includes(role))) return true;
  }

  // Check for department-based enabling
  if (context.departmentId) {
    const enabledDepartments = process.env[`NEXT_PUBLIC_FEATURE_${flag.replace(/-/g, '_').toUpperCase()}_DEPARTMENTS`]?.split(',') || [];
    if (enabledDepartments.includes(context.departmentId)) return true;
  }

  // Admin users can get early access to features if configured
  if ((context.isAdmin || context.isSuperAdmin) && process.env[`NEXT_PUBLIC_FEATURE_${flag.replace(/-/g, '_').toUpperCase()}_ADMIN_EARLY_ACCESS`] === 'true') {
    return true;
  }

  // SuperAdmin users always get access to features
  if (context.isSuperAdmin) {
    return true;
  }

  // Test environments can have different defaults
  if (context.isTestEnvironment && process.env[`NEXT_PUBLIC_FEATURE_${flag.replace(/-/g, '_').toUpperCase()}_TEST`] === 'true') {
    return true;
  }

  // Default flags status - explicitly define defaults for each flag
  const defaults: Record<FeatureFlag, boolean> = {
    'use-new-lms-services': false,
    'use-new-progress-tracking': false,
    'use-new-quiz-system': false,
    'use-new-database-clients': false,
    'use-service-monitoring': true, // Monitoring enabled by default
  };

  return defaults[flag];
}

/**
 * Helper to enable a feature flag for the current browser session
 * (Development only)
 */
export function enableFeatureFlag(flag: FeatureFlag): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    try {
      localStorage.setItem(`feature_${flag}`, 'true');
      console.log(`Feature '${flag}' enabled for this session`);
    } catch (e) {
      console.error('Failed to enable feature flag:', e);
    }
  }
}

/**
 * Helper to disable a feature flag for the current browser session
 * (Development only)
 */
export function disableFeatureFlag(flag: FeatureFlag): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    try {
      localStorage.setItem(`feature_${flag}`, 'false');
      console.log(`Feature '${flag}' disabled for this session`);
    } catch (e) {
      console.error('Failed to disable feature flag:', e);
    }
  }
}

/**
 * Helper to reset a feature flag to default for the current browser session
 * (Development only)
 */
export function resetFeatureFlag(flag: FeatureFlag): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    try {
      localStorage.removeItem(`feature_${flag}`);
      console.log(`Feature '${flag}' reset to default`);
    } catch (e) {
      console.error('Failed to reset feature flag:', e);
    }
  }
}

/**
 * Get all active feature flags for the current context
 */
export function getActiveFeatureFlags(context: FeatureFlagContext = {}): FeatureFlag[] {
  const allFlags: FeatureFlag[] = [
    'use-new-lms-services',
    'use-new-progress-tracking',
    'use-new-quiz-system',
    'use-new-database-clients',
    'use-service-monitoring'
  ];
  
  return allFlags.filter(flag => isFeatureEnabled(flag, context));
} 