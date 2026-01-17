import { supabase } from "@/integrations/supabase/client";

export interface SmsConsentStatus {
  canSendSms: boolean;
  hasConsent: boolean;
  hasPhone: boolean;
  consentDate: string | null;
  reason: string | null;
}

/**
 * Check if SMS can be sent to a customer
 */
export async function checkSmsConsent(customerId: string): Promise<SmsConsentStatus> {
  if (!customerId) {
    return {
      canSendSms: false,
      hasConsent: false,
      hasPhone: false,
      consentDate: null,
      reason: 'No customer ID provided'
    };
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .select('phone, sms_consent, sms_consent_date')
    .eq('id', customerId)
    .single();

  if (error || !customer) {
    return {
      canSendSms: false,
      hasConsent: false,
      hasPhone: false,
      consentDate: null,
      reason: 'Customer not found'
    };
  }

  const hasPhone = !!customer.phone && customer.phone.trim() !== '';
  const hasConsent = customer.sms_consent === true;
  const consentDate = customer.sms_consent_date;

  if (!hasPhone) {
    return {
      canSendSms: false,
      hasConsent,
      hasPhone: false,
      consentDate,
      reason: 'Customer has no phone number'
    };
  }

  if (!hasConsent) {
    return {
      canSendSms: false,
      hasConsent: false,
      hasPhone: true,
      consentDate,
      reason: 'Customer has not consented to SMS'
    };
  }

  return {
    canSendSms: true,
    hasConsent: true,
    hasPhone: true,
    consentDate,
    reason: null
  };
}

/**
 * Update SMS consent for a customer
 */
export async function updateSmsConsent(
  customerId: string,
  consent: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('customers')
    .update({
      sms_consent: consent,
      sms_consent_date: consent ? new Date().toISOString() : null
    })
    .eq('id', customerId);

  if (error) {
    console.error('Error updating SMS consent:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Check SMS consent status for multiple customers
 */
export async function batchCheckSmsConsent(
  customerIds: string[]
): Promise<Map<string, SmsConsentStatus>> {
  const results = new Map<string, SmsConsentStatus>();

  if (customerIds.length === 0) {
    return results;
  }

  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, phone, sms_consent, sms_consent_date')
    .in('id', customerIds);

  if (error || !customers) {
    customerIds.forEach(id => {
      results.set(id, {
        canSendSms: false,
        hasConsent: false,
        hasPhone: false,
        consentDate: null,
        reason: 'Error fetching customer'
      });
    });
    return results;
  }

  customers.forEach(customer => {
    const hasPhone = !!customer.phone && customer.phone.trim() !== '';
    const hasConsent = customer.sms_consent === true;

    let reason: string | null = null;
    if (!hasPhone) reason = 'No phone number';
    else if (!hasConsent) reason = 'No SMS consent';

    results.set(customer.id, {
      canSendSms: hasPhone && hasConsent,
      hasConsent,
      hasPhone,
      consentDate: customer.sms_consent_date,
      reason
    });
  });

  // Handle customers not found
  customerIds.forEach(id => {
    if (!results.has(id)) {
      results.set(id, {
        canSendSms: false,
        hasConsent: false,
        hasPhone: false,
        consentDate: null,
        reason: 'Customer not found'
      });
    }
  });

  return results;
}
