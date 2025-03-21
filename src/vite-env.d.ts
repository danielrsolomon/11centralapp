/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Supabase Configuration
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly SUPABASE_SERVICE_ROLE_KEY: string
  
  // API Configuration
  readonly VITE_API_URL: string
  
  // OpenAI Configuration
  readonly VITE_OPENAI_API_KEY: string
  
  // Development Settings
  readonly VITE_DEV_BYPASS_RLS: string
  
  // Global Feature Flags
  readonly VITE_FEATURE_USE_NEW_LMS_SERVICES: string
  readonly VITE_FEATURE_USE_NEW_PROGRESS_TRACKING: string
  readonly VITE_FEATURE_USE_NEW_QUIZ_SYSTEM: string
  readonly VITE_FEATURE_USE_NEW_DATABASE_CLIENTS: string
  readonly VITE_FEATURE_USE_SERVICE_MONITORING: string
  
  // Role-based Feature Flag Overrides
  readonly VITE_FEATURE_USE_NEW_LMS_SERVICES_ADMIN_EARLY_ACCESS: string
  readonly VITE_FEATURE_USE_NEW_PROGRESS_TRACKING_ADMIN_EARLY_ACCESS: string
  readonly VITE_FEATURE_USE_NEW_QUIZ_SYSTEM_ADMIN_EARLY_ACCESS: string
  readonly VITE_FEATURE_USE_NEW_LMS_SERVICES_ROLES: string
  
  // User-based Feature Flag Overrides
  readonly VITE_FEATURE_USE_NEW_LMS_SERVICES_USERS: string
  readonly VITE_FEATURE_USE_NEW_PROGRESS_TRACKING_USERS: string
  readonly VITE_FEATURE_USE_NEW_QUIZ_SYSTEM_USERS: string
  
  // Testing Feature Flags
  readonly VITE_FEATURE_USE_NEW_LMS_SERVICES_TEST: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 