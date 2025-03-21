/**
 * Utility functions to disable Supabase's auto-refresh mechanisms
 * that cause localStorage errors on the server
 */

/**
 * Disables auto-refresh for a Supabase client instance to prevent
 * localStorage errors on the server
 * 
 * @param client Supabase client instance
 * @returns void
 */
export function disableSupabaseAutoRefresh(client: any): void {
  if (!client || !client.auth) {
    console.warn('[Supabase] Cannot disable auto-refresh: invalid client');
    return;
  }

  try {
    // Disable any existing refresh interval
    if (client.auth._autoRefreshInterval) {
      clearInterval(client.auth._autoRefreshInterval);
      client.auth._autoRefreshInterval = null;
      console.log('[Supabase] Disabled auto-refresh interval');
    }

    // Replace the auto-refresh token tick with a no-op function
    if (typeof client.auth._autoRefreshTokenTick === 'function') {
      client.auth._autoRefreshTokenTick = () => Promise.resolve();
      console.log('[Supabase] Replaced autoRefreshTokenTick with no-op function');
    }

    // Disable any future attempts to start auto-refresh
    if (typeof client.auth._startAutoRefresh === 'function') {
      client.auth._startAutoRefresh = () => {
        console.log('[Supabase] Prevented auto-refresh from starting');
      };
      console.log('[Supabase] Replaced _startAutoRefresh with no-op function');
    }

    // Set refresh option to false
    if (client.auth.autoRefreshToken !== undefined) {
      client.auth.autoRefreshToken = false;
    }
  } catch (error) {
    console.error('[Supabase] Error disabling auto-refresh:', error);
  }
} 