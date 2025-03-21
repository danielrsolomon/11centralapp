/**
 * @deprecated These hooks are deprecated and will be removed in a future version.
 * They make direct Supabase realtime subscriptions which violates the API-first architecture.
 * 
 * For new development, use the WebSocket-based API for real-time features:
 * - For chat messages: Use the chat API endpoints with socket connections
 * - For other real-time needs: Implement through the API server's WebSocket interface
 * 
 * These hooks will be maintained only for legacy components until they can be migrated.
 */

import { useEffect, useState } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { Database } from '../types/database.types';

export type DatabaseChanges<T> = {
  new: T | null;
  old: T | null;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
};

export type SubscriptionCallback<T> = (payload: DatabaseChanges<T>) => void;

/**
 * Hook to subscribe to real-time changes on a Supabase table
 * @param tableName The name of the table to subscribe to
 * @param options Configuration options for the subscription
 * @param callback Function to call when changes are received
 * @returns An object with the current subscription status
 * @deprecated Use API-based WebSocket implementation instead
 */
export function useSupabaseSubscription<T extends Record<string, any>>(
  tableName: string,
  options: {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
    filterValues?: any[];
    schema?: string;
  } = {},
  callback?: SubscriptionCallback<T>
) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [error, setError] = useState<Error | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  
  const { event = '*', filter, filterValues, schema = 'public' } = options;

  useEffect(() => {
    let realtimeChannel: RealtimeChannel;

    const setupSubscription = async () => {
      try {
        setStatus('connecting');
        setError(null);

        // Create subscription configuration
        const channelConfig = supabase
          .channel(`table:${tableName}`)
          .on(
            'postgres_changes' as any,
            {
              event,
              schema,
              table: tableName,
              filter: filter ? filter : undefined,
            }, 
            (payload: RealtimePostgresChangesPayload<T>) => {
              if (callback) {
                callback({
                  new: payload.new as T,
                  old: payload.old as T,
                  eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                });
              }
            }
          );

        // Subscribe and handle connection status
        realtimeChannel = channelConfig
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setStatus('connected');
            } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
              setStatus('disconnected');
              setError(new Error(`Connection ${status.toLowerCase()}`));
            }
          });

        setChannel(realtimeChannel);
      } catch (err) {
        setStatus('disconnected');
        setError(err instanceof Error ? err : new Error('Failed to subscribe'));
        console.error('Error setting up subscription:', err);
      }
    };

    setupSubscription();

    // Cleanup subscription when component unmounts
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
      setStatus('disconnected');
    };
  }, [tableName, event, filter, schema]);

  // Function to manually unsubscribe
  const unsubscribe = () => {
    if (channel) {
      supabase.removeChannel(channel);
      setChannel(null);
      setStatus('disconnected');
    }
  };

  return { status, error, unsubscribe };
}

/**
 * Hook to subscribe to a collection that automatically updates with real-time changes
 * @param tableName The name of the table to subscribe to
 * @param initialQuery Function that returns the initial data
 * @param options Configuration options for the subscription
 * @returns An object with the current collection data and loading state
 * @deprecated Use API-based WebSocket implementation instead
 */
export function useRealtimeCollection<T extends Record<string, any> & { id: string }>(
  tableName: string,
  initialQuery: () => Promise<{ data: T[] | null; error: any }>,
  options: {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
    filterValues?: any[];
    schema?: string;
    dependencyList?: any[];
  } = {}
) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const dependencyList = options.dependencyList || [];

  // Load initial data
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error } = await initialQuery();
        
        if (isMounted) {
          if (error) {
            setError(error);
            setItems([]);
          } else {
            setItems(data || []);
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading data:', err);
          setError(err instanceof Error ? err : new Error('Failed to load data'));
          setItems([]);
          setIsLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, dependencyList);
  
  // Set up real-time subscription
  useSupabaseSubscription<T>(
    tableName,
    options,
    (payload) => {
      setItems(currentItems => {
        // Handle INSERT event
        if (payload.eventType === 'INSERT' && payload.new) {
          return [...currentItems, payload.new];
        }
        
        // Handle UPDATE event
        if (payload.eventType === 'UPDATE' && payload.new) {
          return currentItems.map(item => 
            item.id === payload.new?.id ? payload.new : item
          );
        }
        
        // Handle DELETE event
        if (payload.eventType === 'DELETE' && payload.old) {
          return currentItems.filter(item => item.id !== payload.old?.id);
        }
        
        return currentItems;
      });
    }
  );
  
  return { items, isLoading, error };
}

/**
 * Hook to subscribe to a single item that automatically updates with real-time changes
 * @param tableName The name of the table to subscribe to
 * @param id The ID of the item to subscribe to
 * @param initialQuery Function that returns the initial data
 * @returns An object with the current item data and loading state
 * @deprecated Use API-based WebSocket implementation instead
 */
export function useRealtimeItem<T extends Record<string, any> & { id: string }>(
  tableName: string,
  id: string,
  initialQuery: () => Promise<{ data: T | null; error: any }>
) {
  const [item, setItem] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  
  // Load initial data
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error } = await initialQuery();
        
        if (isMounted) {
          if (error) {
            setError(error);
            setItem(null);
          } else {
            setItem(data);
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading item:', err);
          setError(err instanceof Error ? err : new Error('Failed to load item'));
          setItem(null);
          setIsLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [id]);
  
  // Set up real-time subscription
  useSupabaseSubscription<T>(
    tableName,
    {
      event: '*',
      filter: `id=eq.${id}`
    },
    (payload) => {
      // Handle UPDATE event
      if (payload.eventType === 'UPDATE' && payload.new) {
        setItem(payload.new);
      }
      
      // Handle DELETE event
      if (payload.eventType === 'DELETE') {
        setItem(null);
      }
    }
  );
  
  return { item, isLoading, error };
} 