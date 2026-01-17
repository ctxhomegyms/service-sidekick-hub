import { supabase } from "@/integrations/supabase/client";
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { format, parseISO } from 'date-fns';

// Default timezone if not configured
const DEFAULT_TIMEZONE = 'America/Chicago';

// Cache for company settings
let cachedTimezone: string | null = null;
let cacheExpiry: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get the configured business timezone
 */
export async function getBusinessTimezone(): Promise<string> {
  const now = Date.now();
  
  // Return cached value if still valid
  if (cachedTimezone && now < cacheExpiry) {
    return cachedTimezone;
  }

  const { data, error } = await supabase
    .from('company_settings')
    .select('business_timezone')
    .limit(1)
    .single();

  if (error || !data?.business_timezone) {
    cachedTimezone = DEFAULT_TIMEZONE;
  } else {
    cachedTimezone = data.business_timezone;
  }
  
  cacheExpiry = now + CACHE_DURATION;
  return cachedTimezone;
}

/**
 * Format a date/time for display in business timezone
 */
export async function formatInBusinessTimezone(
  dateTime: string | Date,
  formatStr: string = 'MMM d, yyyy h:mm a'
): Promise<string> {
  const timezone = await getBusinessTimezone();
  const date = typeof dateTime === 'string' ? parseISO(dateTime) : dateTime;
  
  try {
    return formatInTimeZone(date, timezone, formatStr);
  } catch {
    return format(date, formatStr);
  }
}

/**
 * Format time only in business timezone
 */
export async function formatTimeInBusinessTimezone(
  time: string,
  formatStr: string = 'h:mm a'
): Promise<string> {
  const timezone = await getBusinessTimezone();
  
  try {
    // Parse time string (HH:mm or HH:mm:ss)
    const today = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    today.setHours(hours, minutes, 0, 0);
    
    return formatInTimeZone(today, timezone, formatStr);
  } catch {
    return time;
  }
}

/**
 * Format date in business timezone
 */
export async function formatDateInBusinessTimezone(
  date: string | Date,
  formatStr: string = 'MMM d, yyyy'
): Promise<string> {
  const timezone = await getBusinessTimezone();
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  try {
    return formatInTimeZone(dateObj, timezone, formatStr);
  } catch {
    return format(dateObj, formatStr);
  }
}

/**
 * Get current date/time in business timezone
 */
export async function getCurrentBusinessTime(): Promise<Date> {
  const timezone = await getBusinessTimezone();
  return toZonedTime(new Date(), timezone);
}

/**
 * Check if a date is today in business timezone
 */
export async function isBusinessToday(date: string | Date): Promise<boolean> {
  const timezone = await getBusinessTimezone();
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  
  const dateStr = formatInTimeZone(dateObj, timezone, 'yyyy-MM-dd');
  const todayStr = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
  
  return dateStr === todayStr;
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    // Future
    const futureMins = Math.abs(diffMins);
    const futureHours = Math.abs(diffHours);
    const futureDays = Math.abs(diffDays);
    
    if (futureMins < 60) return `in ${futureMins} minute${futureMins !== 1 ? 's' : ''}`;
    if (futureHours < 24) return `in ${futureHours} hour${futureHours !== 1 ? 's' : ''}`;
    return `in ${futureDays} day${futureDays !== 1 ? 's' : ''}`;
  }

  // Past
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  
  return format(dateObj, 'MMM d, yyyy');
}

/**
 * Clear the timezone cache (useful after settings update)
 */
export function clearTimezoneCache(): void {
  cachedTimezone = null;
  cacheExpiry = 0;
}
