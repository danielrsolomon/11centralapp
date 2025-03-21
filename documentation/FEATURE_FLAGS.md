# Feature Flags Documentation

This document describes the feature flags used in the E11EVEN Central application and how to configure them.

## What Are Feature Flags?

Feature flags are a technique that allows developers to enable or disable functionality at runtime without deploying new code. In the E11EVEN Central app, we use feature flags to:

- Gradually roll out new features
- A/B test different implementations
- Provide early access to select users or roles
- Quickly disable problematic features without a code deployment
- Control access to experimental or in-progress features

## Available Feature Flags

| Flag | Description | Default Value |
|------|-------------|---------------|
| `VITE_FEATURE_USE_NEW_LMS_SERVICES` | Controls whether to use the new Learning Management System services implementation. When enabled, the app will use optimized service layer patterns for university content. | `false` |
| `VITE_FEATURE_USE_NEW_PROGRESS_TRACKING` | Enables the new progress tracking system with improved data consistency and real-time updates. | `false` |
| `VITE_FEATURE_USE_NEW_QUIZ_SYSTEM` | Activates the new quiz engine with enhanced scoring, timing, and interactive elements. | `false` |
| `VITE_FEATURE_USE_NEW_DATABASE_CLIENTS` | Uses optimized database access patterns for better performance and reduced load on Supabase. | `true` |
| `VITE_FEATURE_USE_SERVICE_MONITORING` | Enables detailed service monitoring for debugging and diagnostics. | `true` |

## Role-Based and User-Based Flag Overrides

Some feature flags can be overridden for specific roles or users:

| Flag | Description |
|------|-------------|
| `VITE_FEATURE_USE_NEW_LMS_SERVICES_ADMIN_EARLY_ACCESS` | Gives admin users access to new LMS features regardless of the global feature flag. | 
| `VITE_FEATURE_USE_NEW_PROGRESS_TRACKING_ADMIN_EARLY_ACCESS` | Gives admin users access to new progress tracking regardless of the global feature flag. |
| `VITE_FEATURE_USE_NEW_QUIZ_SYSTEM_ADMIN_EARLY_ACCESS` | Gives admin users access to new quiz system regardless of the global feature flag. |
| `VITE_FEATURE_USE_NEW_LMS_SERVICES_USERS` | Comma-separated list of user IDs that should have access to the new LMS services. |
| `VITE_FEATURE_USE_NEW_LMS_SERVICES_ROLES` | Comma-separated list of roles that should have access to the new LMS services. |

## How Feature Flags Are Implemented

Feature flags are implemented in the codebase using utility functions that provide a consistent interface for checking whether features are enabled:

1. **Frontend flags**: Use the `isFeatureEnabled` utility from `src/utils/env.ts`:

```typescript
import { isFeatureEnabled } from '../utils/env';

const useNewLmsServices = isFeatureEnabled(
  'VITE_FEATURE_USE_NEW_LMS_SERVICES',
  userRole,
  userId
);

// Conditionally use the appropriate service
const courseService = useNewLmsServices 
  ? newCourseService 
  : legacyCourseService;
```

2. **API flags**: Use the `isFeatureEnabledServer` utility for server-side code:

```typescript
import { isFeatureEnabledServer } from '../utils/env.js';

const useNewLmsServices = isFeatureEnabledServer(
  'VITE_FEATURE_USE_NEW_LMS_SERVICES',
  req.user?.role,
  req.user?.id
);

// Use the appropriate service based on the flag
const service = useNewLmsServices 
  ? newUniversityService 
  : legacyUniversityService;
```

## Configuring Feature Flags

Feature flags are configured through environment variables in your `.env.local` file (preferred) or the appropriate environment file for your deployment environment.

### Example Configuration

```bash
# Global feature flags
VITE_FEATURE_USE_NEW_LMS_SERVICES=false
VITE_FEATURE_USE_NEW_PROGRESS_TRACKING=false
VITE_FEATURE_USE_NEW_QUIZ_SYSTEM=false
VITE_FEATURE_USE_NEW_DATABASE_CLIENTS=true
VITE_FEATURE_USE_SERVICE_MONITORING=true

# Role and user based overrides
VITE_FEATURE_USE_NEW_LMS_SERVICES_ADMIN_EARLY_ACCESS=true
VITE_FEATURE_USE_NEW_PROGRESS_TRACKING_ADMIN_EARLY_ACCESS=true
VITE_FEATURE_USE_NEW_QUIZ_SYSTEM_ADMIN_EARLY_ACCESS=true
VITE_FEATURE_USE_NEW_LMS_SERVICES_USERS=4b5ebee9-f260-4a4e-903e-fbd5f5369a09,8a7c9f31-e543-4b87-9d22-31fabc42a118
VITE_FEATURE_USE_NEW_LMS_SERVICES_ROLES=admin,seniorManager
```

## Current Implementation Status

The feature flag system has been implemented via utility functions in `src/utils/env.ts`, but not all parts of the codebase have been updated to use these utilities yet. As part of the ongoing refactoring effort:

1. **Existing direct references** to `import.meta.env.VITE_FEATURE_*` should be replaced with calls to `isFeatureEnabled`
2. **API routes** should use `isFeatureEnabledServer` instead of direct access to `process.env`
3. **Service layer integration** is being updated to properly utilize feature flags for service selection

## Troubleshooting Feature Flags

If you're experiencing issues related to feature flags:

1. **Check flag configuration**: Verify that your `.env.local` file contains the correct feature flag settings.
2. **Clear cache**: Sometimes Vite caches environment variables - restart the development server.
3. **Inspect logging**: The application logs feature flag status on startup in development mode.
4. **Check utility usage**: Ensure you're using the feature flag utilities correctly with proper arguments.
5. **Try fallback mode**: Set the relevant feature flag to `false` to use the stable implementation.

## Adding New Feature Flags

When adding new feature flags:

1. Add the flag to `.env.example` and relevant documentation
2. Include sensible defaults
3. Add clear inline code comments explaining the flag's purpose
4. Update type definitions in `src/vite-env.d.ts`
5. Update this documentation
6. Consider whether admin early access is appropriate 