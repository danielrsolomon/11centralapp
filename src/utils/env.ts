export const getEnvVariable = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    console.warn(`Missing environment variable: ${key}`);
    return '';
  }
  return value;
};

/**
 * Check if a feature flag is enabled
 * @param flagName - The name of the feature flag
 * @param userRole - Optional user role for role-based flags
 * @param userId - Optional user ID for user-based flags
 * @returns boolean
 */
export const isFeatureEnabled = (
  flagName: string,
  userRole?: string | null,
  userId?: string | null
): boolean => {
  // Check if feature flag exists
  const flagValue = import.meta.env[flagName] || '';
  
  // Default to disabled if not set
  if (!flagValue) {
    return false;
  }

  // Check if global flag is enabled
  if (flagValue === 'true') {
    return true;
  }

  // Check admin early access flags
  if (userRole === 'admin' || userRole === 'superAdmin') {
    const adminAccessFlag = import.meta.env[`${flagName}_ADMIN_EARLY_ACCESS`];
    if (adminAccessFlag === 'true') {
      return true;
    }
  }

  // Check role-based overrides
  if (userRole) {
    const roleOverrides = import.meta.env[`${flagName}_ROLES`] || '';
    if (roleOverrides.split(',').includes(userRole)) {
      return true;
    }
  }

  // Check user-specific overrides
  if (userId) {
    const userOverrides = import.meta.env[`${flagName}_USERS`] || '';
    if (userOverrides.split(',').includes(userId)) {
      return true;
    }
  }

  return false;
};

/**
 * Server-side feature flag check
 * Similar to isFeatureEnabled but uses process.env instead of import.meta.env
 */
export const isFeatureEnabledServer = (
  flagName: string,
  userRole?: string | null,
  userId?: string | null
): boolean => {
  // NodeJS environment
  if (typeof process === 'undefined' || !process.env) {
    return false;
  }
  
  // Check if feature flag exists
  const flagValue = process.env[flagName] || '';
  
  // Default to disabled if not set
  if (!flagValue) {
    return false;
  }

  // Check if global flag is enabled
  if (flagValue === 'true') {
    return true;
  }

  // Check admin early access flags
  if (userRole === 'admin' || userRole === 'superAdmin') {
    const adminAccessFlag = process.env[`${flagName}_ADMIN_EARLY_ACCESS`];
    if (adminAccessFlag === 'true') {
      return true;
    }
  }

  // Check role-based overrides
  if (userRole) {
    const roleOverrides = process.env[`${flagName}_ROLES`] || '';
    if (roleOverrides.split(',').includes(userRole)) {
      return true;
    }
  }

  // Check user-specific overrides
  if (userId) {
    const userOverrides = process.env[`${flagName}_USERS`] || '';
    if (userOverrides.split(',').includes(userId)) {
      return true;
    }
  }

  return false;
};
