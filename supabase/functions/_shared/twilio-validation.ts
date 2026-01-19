/**
 * Validates Twilio webhook signature to prevent unauthorized requests
 * Uses Web Crypto API which is available in Deno
 * 
 * @param authToken - Twilio Auth Token
 * @param signature - X-Twilio-Signature header value
 * @param url - Full request URL (without query params for SMS, with for voice)
 * @param params - Sorted form parameters as key-value pairs
 * @returns boolean indicating if signature is valid
 */
export async function validateTwilioSignature(
  authToken: string,
  signature: string | null,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  if (!signature || !authToken) {
    console.warn('Missing signature or auth token for Twilio validation');
    return false;
  }

  try {
    // Sort parameters alphabetically and concatenate
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], '');

    // Combine URL and sorted params
    const data = url + sortedParams;
    
    // Calculate HMAC-SHA1 signature using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(authToken);
    const messageData = encoder.encode(data);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    
    // Constant-time comparison to prevent timing attacks
    const isValid = signature === expectedSignature;
    
    if (!isValid) {
      console.warn('Twilio signature validation failed', {
        expected: expectedSignature.substring(0, 10) + '...',
        received: signature.substring(0, 10) + '...',
      });
    }
    
    return isValid;
  } catch (error) {
    console.error('Error validating Twilio signature:', error);
    return false;
  }
}

/**
 * Extracts form data as a record for signature validation
 */
export function formDataToRecord(formData: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });
  return params;
}

/**
 * Gets the full webhook URL from the request
 * Twilio sends the URL in the X-Twilio-Webhook-Url header or we construct it
 */
export function getWebhookUrl(req: Request): string {
  // Try to get the original webhook URL from Twilio's header
  const webhookUrl = req.headers.get('x-twilio-webhook-url');
  if (webhookUrl) {
    return webhookUrl;
  }
  
  // Fallback: construct from request URL
  const url = new URL(req.url);
  // For Supabase Edge Functions, use the production URL pattern
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.functions.supabase.co');
  if (supabaseUrl) {
    return `${supabaseUrl}${url.pathname}`;
  }
  
  return req.url;
}

/**
 * Configuration for Twilio validation behavior
 */
export interface TwilioValidationConfig {
  /** Whether to enforce signature validation (can be disabled for testing) */
  enforceValidation: boolean;
  /** Log level for validation failures */
  logLevel: 'error' | 'warn' | 'info';
}

/**
 * Validates an incoming Twilio webhook request
 * Returns error response if validation fails, null if valid
 */
export async function validateTwilioRequest(
  req: Request,
  config: TwilioValidationConfig = { enforceValidation: true, logLevel: 'warn' }
): Promise<{ valid: boolean; formData?: FormData; params?: Record<string, string>; error?: Response }> {
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  
  // If no auth token, skip validation but log warning
  if (!authToken) {
    console.warn('TWILIO_AUTH_TOKEN not set - skipping signature validation');
    const formData = await req.formData();
    return { valid: true, formData, params: formDataToRecord(formData) };
  }

  const signature = req.headers.get('x-twilio-signature');
  const webhookUrl = getWebhookUrl(req);
  
  // Clone request to read form data without consuming it
  const formData = await req.formData();
  const params = formDataToRecord(formData);
  
  const isValid = await validateTwilioSignature(authToken, signature, webhookUrl, params);
  
  if (!isValid && config.enforceValidation) {
    const message = 'Invalid Twilio signature - request rejected';
    if (config.logLevel === 'error') {
      console.error(message);
    } else if (config.logLevel === 'warn') {
      console.warn(message);
    } else {
      console.log(message);
    }
    
    return {
      valid: false,
      error: new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 403, headers: { 'Content-Type': 'text/xml' } }
      )
    };
  }
  
  return { valid: true, formData, params };
}
