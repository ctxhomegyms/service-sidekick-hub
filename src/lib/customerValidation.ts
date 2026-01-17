import { supabase } from "@/integrations/supabase/client";

export interface DuplicateCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  match_type: 'phone' | 'email' | 'unknown';
}

/**
 * Check for potential duplicate customers based on phone or email
 */
export async function findDuplicateCustomers(
  phone?: string | null,
  email?: string | null,
  excludeId?: string
): Promise<DuplicateCustomer[]> {
  if ((!phone || phone.trim() === '') && (!email || email.trim() === '')) {
    return [];
  }

  const { data, error } = await supabase.rpc('find_duplicate_customers', {
    p_phone: phone || null,
    p_email: email || null,
    p_exclude_id: excludeId || null
  });

  if (error) {
    console.error('Error finding duplicate customers:', error);
    return [];
  }

  return (data || []) as DuplicateCustomer[];
}

/**
 * Validate that a customer has at least one contact method
 */
export function validateContactInfo(
  phone?: string | null,
  email?: string | null
): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  const hasPhone = phone && phone.trim() !== '';
  const hasEmail = email && email.trim() !== '';
  
  if (!hasPhone && !hasEmail) {
    warnings.push('Customer has no contact information. SMS and email notifications will not be possible.');
  } else if (!hasPhone) {
    warnings.push('Customer has no phone number. SMS notifications will not be possible.');
  } else if (!hasEmail) {
    warnings.push('Customer has no email address. Email notifications will not be possible.');
  }

  return {
    isValid: hasPhone || hasEmail,
    warnings
  };
}

/**
 * Normalize a phone number to E.164 format (client-side)
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle US numbers
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  } else if (digits.length >= 10) {
    return `+${digits}`;
  }
  
  return phone;
}

/**
 * Format phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';
  
  // If already in E.164 format (+1XXXXXXXXXX)
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  return phone;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}
