import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseResilientSubscriptionOptions {
  channelName: string;
  table: string;
  schema?: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  filter?: string;
  onData: (payload: unknown) => void;
  enabled?: boolean;
  maxRetries?: number;
  baseRetryDelay?: number;
}

interface SubscriptionStatus {
  isConnected: boolean;
  retryCount: number;
  lastError: string | null;
}

/**
 * Hook for resilient Supabase realtime subscriptions with automatic reconnection
 */
export function useResilientSubscription(options: UseResilientSubscriptionOptions) {
  const {
    channelName,
    table,
    schema = 'public',
    event = '*',
    filter,
    onData,
    enabled = true,
    maxRetries = 5,
    baseRetryDelay = 1000,
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(true);
  const onDataRef = useRef(onData);

  const [status, setStatus] = useState<SubscriptionStatus>({
    isConnected: false,
    retryCount: 0,
    lastError: null,
  });

  // Keep onData ref updated
  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);

  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const subscribe = useCallback(() => {
    if (!isActiveRef.current || !enabled) return;

    cleanup();

    const channelConfig: Record<string, unknown> = {
      event,
      schema,
      table,
    };
    
    if (filter) {
      channelConfig.filter = filter;
    }

    channelRef.current = supabase
      .channel(`${channelName}-${Date.now()}`)
      .on('postgres_changes', channelConfig as Parameters<typeof supabase.channel>[0] extends string ? never : never, (payload) => {
        retryCountRef.current = 0;
        setStatus(s => ({ ...s, retryCount: 0, lastError: null }));
        onDataRef.current(payload);
      })
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === 'SUBSCRIBED') {
          setStatus({ isConnected: true, retryCount: 0, lastError: null });
          retryCountRef.current = 0;
        } else if (
          (subscriptionStatus === 'CHANNEL_ERROR' || subscriptionStatus === 'TIMED_OUT') &&
          isActiveRef.current
        ) {
          handleRetry(subscriptionStatus);
        }
      });
  }, [channelName, table, schema, event, filter, enabled, cleanup]);

  const handleRetry = useCallback((errorType: string) => {
    setStatus(s => ({
      ...s,
      isConnected: false,
      lastError: errorType,
    }));

    if (retryCountRef.current < maxRetries && isActiveRef.current) {
      retryCountRef.current++;
      const delay = baseRetryDelay * Math.pow(2, retryCountRef.current - 1);
      
      setStatus(s => ({ ...s, retryCount: retryCountRef.current }));
      console.log(`Retrying subscription ${channelName} in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);

      retryTimeoutRef.current = setTimeout(() => {
        if (isActiveRef.current) {
          subscribe();
        }
      }, delay);
    } else if (retryCountRef.current >= maxRetries) {
      console.error(`Max retries (${maxRetries}) reached for ${channelName}`);
      setStatus(s => ({
        ...s,
        lastError: `Max retries reached: ${errorType}`,
      }));
    }
  }, [maxRetries, baseRetryDelay, channelName, subscribe]);

  useEffect(() => {
    isActiveRef.current = true;
    
    if (enabled) {
      subscribe();
    }

    return () => {
      isActiveRef.current = false;
      cleanup();
    };
  }, [enabled, subscribe, cleanup]);

  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    subscribe();
  }, [subscribe]);

  return {
    status,
    reconnect,
  };
}
