/**
 * Edge case handling utilities for robust application behavior
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// PHONE VALIDATION - Extended international support
// ============================================================================

export interface ExtendedPhoneValidation {
  isValid: boolean;
  normalized: string | null;
  countryCode: string | null;
  isInternational: boolean;
  error: string | null;
}

/**
 * Extended phone validation with international support
 * Supports US, Canada, UK, and general international formats
 */
export function validatePhoneExtended(phone: string): ExtendedPhoneValidation {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, normalized: null, countryCode: null, isInternational: false, error: 'Phone number is required' };
  }

  const hasPlus = phone.trim().startsWith('+');
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 0) {
    return { isValid: false, normalized: null, countryCode: null, isInternational: false, error: 'Phone number must contain digits' };
  }

  // US/Canada: 10 digits or 11 starting with 1
  if (digits.length === 10) {
    if (digits[0] === '0' || digits[0] === '1') {
      return { isValid: false, normalized: null, countryCode: null, isInternational: false, error: 'Invalid area code' };
    }
    return { isValid: true, normalized: `+1${digits}`, countryCode: '1', isInternational: false, error: null };
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    const national = digits.substring(1);
    if (national[0] === '0' || national[0] === '1') {
      return { isValid: false, normalized: null, countryCode: null, isInternational: false, error: 'Invalid area code' };
    }
    return { isValid: true, normalized: `+${digits}`, countryCode: '1', isInternational: false, error: null };
  }

  // UK: 10-11 digits starting with 44
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('44')) {
    return { isValid: true, normalized: `+${digits}`, countryCode: '44', isInternational: true, error: null };
  }

  // General international with + prefix
  if (hasPlus && digits.length >= 7 && digits.length <= 15) {
    const countryCode = digits.length <= 11 ? digits.substring(0, 1) : 
                        digits.length <= 12 ? digits.substring(0, 2) : 
                        digits.substring(0, 3);
    return { isValid: true, normalized: `+${digits}`, countryCode, isInternational: true, error: null };
  }

  if (digits.length < 7) {
    return { isValid: false, normalized: null, countryCode: null, isInternational: false, error: 'Phone number too short' };
  }

  if (digits.length > 15) {
    return { isValid: false, normalized: null, countryCode: null, isInternational: false, error: 'Phone number too long' };
  }

  return { isValid: false, normalized: null, countryCode: null, isInternational: false, error: 'Invalid phone format' };
}

// ============================================================================
// BUSINESS HOURS VALIDATION
// ============================================================================

export interface BusinessHoursCheck {
  isWithinHours: boolean;
  nextOpen: Date | null;
  message: string | null;
}

/**
 * Check if a given time is within business hours
 */
export async function checkBusinessHours(
  date: string,
  time: string
): Promise<BusinessHoursCheck> {
  try {
    const dateObj = new Date(`${date}T${time}`);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday

    const { data: hours } = await supabase
      .from('business_hours')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .single();

    if (!hours || !hours.is_open) {
      return {
        isWithinHours: false,
        nextOpen: null,
        message: 'Business is closed on this day'
      };
    }

    const timeStr = time.substring(0, 5);
    const openTime = hours.open_time.substring(0, 5);
    const closeTime = hours.close_time.substring(0, 5);

    if (timeStr < openTime || timeStr >= closeTime) {
      return {
        isWithinHours: false,
        nextOpen: null,
        message: `Outside business hours (${openTime} - ${closeTime})`
      };
    }

    return { isWithinHours: true, nextOpen: null, message: null };
  } catch {
    // If no business hours configured, assume always open
    return { isWithinHours: true, nextOpen: null, message: null };
  }
}

// ============================================================================
// FORM SUBMISSION HELPERS
// ============================================================================

/**
 * Create a debounced submit handler to prevent double submissions
 */
export function createSubmitGuard() {
  let isSubmitting = false;
  let lastSubmitTime = 0;
  const MIN_SUBMIT_INTERVAL = 1000; // 1 second minimum between submissions

  return {
    canSubmit: () => {
      const now = Date.now();
      if (isSubmitting) return false;
      if (now - lastSubmitTime < MIN_SUBMIT_INTERVAL) return false;
      return true;
    },
    startSubmit: () => {
      isSubmitting = true;
      lastSubmitTime = Date.now();
    },
    endSubmit: () => {
      isSubmitting = false;
    },
    isSubmitting: () => isSubmitting
  };
}

// ============================================================================
// REALTIME SUBSCRIPTION RECOVERY
// ============================================================================

export interface RealtimeSubscriptionConfig {
  channelName: string;
  table: string;
  schema?: string;
  onData: (payload: unknown) => void;
  onError?: (error: Error) => void;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Create a resilient realtime subscription with automatic reconnection
 */
export function createResilientSubscription(config: RealtimeSubscriptionConfig) {
  const {
    channelName,
    table,
    schema = 'public',
    onData,
    onError,
    maxRetries = 5,
    retryDelay = 1000,
  } = config;

  let retryCount = 0;
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let isActive = true;

  const subscribe = () => {
    if (!isActive) return;

    channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema, table }, (payload) => {
        retryCount = 0; // Reset on successful message
        onData(payload);
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' && isActive) {
          handleError(new Error('Channel error'));
        }
        if (status === 'TIMED_OUT' && isActive) {
          handleError(new Error('Subscription timed out'));
        }
      });
  };

  const handleError = (error: Error) => {
    onError?.(error);
    
    if (retryCount < maxRetries && isActive) {
      retryCount++;
      const delay = retryDelay * Math.pow(2, retryCount - 1); // Exponential backoff
      console.log(`Retrying subscription in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
      
      setTimeout(() => {
        if (channel) {
          supabase.removeChannel(channel);
        }
        subscribe();
      }, delay);
    } else {
      console.error(`Max retries (${maxRetries}) reached for subscription ${channelName}`);
    }
  };

  subscribe();

  return {
    unsubscribe: () => {
      isActive = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    },
    getRetryCount: () => retryCount
  };
}

// ============================================================================
// OFFLINE DETECTION
// ============================================================================

/**
 * Check if the browser is currently online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Create an offline-aware operation queue
 */
export function createOfflineQueue<T>() {
  const queue: Array<{ operation: () => Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void }> = [];
  let isProcessing = false;

  const processQueue = async () => {
    if (isProcessing || queue.length === 0 || !isOnline()) return;
    
    isProcessing = true;
    
    while (queue.length > 0 && isOnline()) {
      const item = queue.shift();
      if (item) {
        try {
          const result = await item.operation();
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        }
      }
    }
    
    isProcessing = false;
  };

  // Listen for online events
  if (typeof window !== 'undefined') {
    window.addEventListener('online', processQueue);
  }

  return {
    enqueue: (operation: () => Promise<T>): Promise<T> => {
      return new Promise((resolve, reject) => {
        queue.push({ operation, resolve, reject });
        processQueue();
      });
    },
    getQueueLength: () => queue.length,
    isProcessing: () => isProcessing
  };
}

// ============================================================================
// VERSION CONFLICT DETECTION
// ============================================================================

export interface VersionCheck {
  hasConflict: boolean;
  currentVersion: number;
  serverVersion: number;
}

/**
 * Check if a job has been modified since last fetch
 */
export async function checkJobVersion(jobId: string, expectedVersion: number): Promise<VersionCheck> {
  const { data } = await supabase
    .from('jobs')
    .select('version')
    .eq('id', jobId)
    .single();

  const serverVersion = data?.version ?? 1;
  
  return {
    hasConflict: serverVersion !== expectedVersion,
    currentVersion: expectedVersion,
    serverVersion
  };
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize text input to prevent XSS
 */
export function sanitizeTextInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Validate and sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'file';
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}
