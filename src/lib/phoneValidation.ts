/**
 * Phone number validation and normalization utilities
 * Validates and converts phone numbers to E.164 format
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string | null;
  error: string | null;
}

/**
 * Normalize a phone number to E.164 format (+1XXXXXXXXXX for US)
 * Strips formatting, validates digit count, and adds country code if missing
 */
export function normalizePhoneNumber(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, normalized: null, error: 'Phone number is required' };
  }

  // Remove all non-digit characters except leading +
  const hasPlus = phone.trim().startsWith('+');
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 0) {
    return { isValid: false, normalized: null, error: 'Phone number must contain digits' };
  }

  // Check for obviously fake numbers (555 area code in US is reserved)
  if (digits.length >= 10) {
    const areaCode = digits.length === 11 && digits.startsWith('1') 
      ? digits.substring(1, 4) 
      : digits.substring(0, 3);
    if (areaCode === '555') {
      return { isValid: false, normalized: null, error: 'Invalid area code (555 is not a valid area code)' };
    }
  }

  // US number validation (10 digits or 11 starting with 1)
  if (digits.length === 10) {
    // Validate area code (first digit can't be 0 or 1)
    if (digits[0] === '0' || digits[0] === '1') {
      return { isValid: false, normalized: null, error: 'Invalid US area code' };
    }
    // Validate exchange code (4th digit can't be 0 or 1)
    if (digits[3] === '0' || digits[3] === '1') {
      return { isValid: false, normalized: null, error: 'Invalid US phone number format' };
    }
    return { isValid: true, normalized: `+1${digits}`, error: null };
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    const nationalNumber = digits.substring(1);
    // Validate area code
    if (nationalNumber[0] === '0' || nationalNumber[0] === '1') {
      return { isValid: false, normalized: null, error: 'Invalid US area code' };
    }
    // Validate exchange code
    if (nationalNumber[3] === '0' || nationalNumber[3] === '1') {
      return { isValid: false, normalized: null, error: 'Invalid US phone number format' };
    }
    return { isValid: true, normalized: `+${digits}`, error: null };
  }

  // International numbers (must have + prefix and be 7-15 digits per E.164)
  if (hasPlus && digits.length >= 7 && digits.length <= 15) {
    return { isValid: true, normalized: `+${digits}`, error: null };
  }

  // Invalid length
  if (digits.length < 10) {
    return { isValid: false, normalized: null, error: 'Phone number is too short (minimum 10 digits for US)' };
  }

  if (digits.length > 15) {
    return { isValid: false, normalized: null, error: 'Phone number is too long (maximum 15 digits)' };
  }

  return { isValid: false, normalized: null, error: 'Invalid phone number format. Use format: (555) 123-4567' };
}

/**
 * Format a normalized E.164 number for display
 */
export function formatPhoneForDisplay(e164Phone: string): string {
  if (!e164Phone) return '';
  
  // US number formatting: +1 (XXX) XXX-XXXX
  if (e164Phone.startsWith('+1') && e164Phone.length === 12) {
    const digits = e164Phone.substring(2);
    return `+1 (${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
  }
  
  return e164Phone;
}

/**
 * Quick check if a phone number looks valid (for UI feedback)
 */
export function isPhoneNumberValid(phone: string): boolean {
  return normalizePhoneNumber(phone).isValid;
}
