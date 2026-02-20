import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateTwilioRequest } from "../_shared/twilio-validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TCPA-required keyword sets (case-insensitive, exact match after trim)
const STOP_KEYWORDS = new Set(['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit']);
const START_KEYWORDS = new Set(['start', 'yes', 'unstop']);
const HELP_KEYWORDS = new Set(['help', 'info']);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate Twilio signature
    const validation = await validateTwilioRequest(req);
    if (!validation.valid) {
      console.error('Invalid Twilio signature - rejecting webhook');
      return validation.error!;
    }

    const { params } = validation;
    
    const from = params?.From || '';
    const to = params?.To || '';
    const body = params?.Body || '';
    const messageSid = params?.MessageSid || '';

    console.log('Received inbound SMS:', { from, to, body: body?.substring(0, 50), messageSid });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for duplicate message (idempotency)
    if (messageSid) {
      const { data: existingMessage } = await supabase
        .from('conversation_messages')
        .select('id')
        .eq('metadata->>messageSid', messageSid)
        .maybeSingle();

      if (existingMessage) {
        console.log('Duplicate message detected, skipping:', messageSid);
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
        );
      }
    }

    if (!from || !body) {
      console.error('Missing required fields');
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    }

    // Normalize phone number (remove +1 prefix for matching)
    const normalizedPhone = from.replace(/^\+1/, '').replace(/\D/g, '');
    
    // Try to find a customer with this phone number
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, phone, sms_consent')
      .or(`phone.ilike.%${normalizedPhone}%,phone.ilike.%${from}%`)
      .limit(1);

    const customer = customers?.[0];
    console.log('Found customer:', customer?.name);

    // ---------------------------------------------------------------
    // TCPA KEYWORD HANDLING — must be processed BEFORE saving message
    // ---------------------------------------------------------------
    const keyword = body.trim().toLowerCase();

    if (STOP_KEYWORDS.has(keyword)) {
      console.log('STOP keyword received from:', from);

      // Update customer sms_consent to false
      if (customer) {
        await supabase
          .from('customers')
          .update({ sms_consent: false, sms_consent_date: new Date().toISOString() })
          .eq('id', customer.id);
        console.log(`SMS consent revoked for customer ${customer.id}`);
      }

      // Fetch company settings for the opt-out confirmation message
      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('business_name, business_phone')
        .limit(1)
        .single();

      const companyName = companySettings?.business_name || 'our service';

      // Fetch configurable STOP response from auto_reply_settings if present
      const { data: stopTemplate } = await supabase
        .from('auto_reply_settings')
        .select('message_template')
        .eq('trigger_type', 'stop_keyword' as any)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      // TCPA-required language: must identify program, confirm unsubscribe, state no more messages
      const stopMessage = stopTemplate?.message_template ||
        `You have been unsubscribed from ${companyName} SMS notifications. No further messages will be sent. Reply START to re-subscribe.`;

      // Send opt-out confirmation via Twilio directly (bypassing consent check — this is required)
      const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');
      if (accountSid && authToken && twilioPhone) {
        const formData = new URLSearchParams();
        formData.append('To', from);
        formData.append('From', twilioPhone);
        formData.append('Body', stopMessage);
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });
      }

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    }

    if (START_KEYWORDS.has(keyword)) {
      console.log('START keyword received from:', from);

      // Update customer sms_consent to true
      if (customer) {
        await supabase
          .from('customers')
          .update({ sms_consent: true, sms_consent_date: new Date().toISOString() })
          .eq('id', customer.id);
        console.log(`SMS consent restored for customer ${customer.id}`);
      }

      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('business_name')
        .limit(1)
        .single();

      const companyName = companySettings?.business_name || 'our service';
      const startMessage = `You have been re-subscribed to ${companyName} SMS notifications. Reply STOP to opt out at any time.`;

      const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');
      if (accountSid && authToken && twilioPhone) {
        const formData = new URLSearchParams();
        formData.append('To', from);
        formData.append('From', twilioPhone);
        formData.append('Body', startMessage);
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });
      }

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    }

    if (HELP_KEYWORDS.has(keyword)) {
      console.log('HELP keyword received from:', from);

      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('business_name, business_phone, business_email')
        .limit(1)
        .single();

      const companyName = companySettings?.business_name || 'our service';
      const companyPhone = companySettings?.business_phone || '';
      const companyEmail = companySettings?.business_email || '';

      // Fetch configurable HELP response
      const { data: helpTemplate } = await supabase
        .from('auto_reply_settings')
        .select('message_template')
        .eq('trigger_type', 'help_keyword' as any)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const helpMessage = helpTemplate?.message_template ||
        [
          `${companyName} SMS Alerts.`,
          companyPhone ? `Support: ${companyPhone}.` : '',
          companyEmail ? `Email: ${companyEmail}.` : '',
          'Msg & data rates may apply.',
          'Reply STOP to opt out.',
        ].filter(Boolean).join(' ');

      const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');
      if (accountSid && authToken && twilioPhone) {
        const formData = new URLSearchParams();
        formData.append('To', from);
        formData.append('From', twilioPhone);
        formData.append('Body', helpMessage);
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });
      }

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    }
    // ---------------------------------------------------------------
    // END keyword handling
    // ---------------------------------------------------------------

    // Check for existing open conversation from this number
    let conversationId: string | null = null;
    
    if (customer) {
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('channel', 'sms')
        .neq('status', 'closed')
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConversation) {
        conversationId = existingConversation.id;
        console.log('Found existing conversation:', conversationId);
      }
    }

    // If no existing conversation, create a new one
    if (!conversationId) {
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          customer_id: customer?.id || null,
          channel: 'sms',
          status: 'unread',
          subject: customer ? `SMS from ${customer.name}` : `SMS from ${from}`,
        })
        .select('id')
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        throw convError;
      }

      conversationId = newConversation.id;
      console.log('Created new conversation:', conversationId);
    }

    // Add the message to the conversation
    const { error: msgError } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        content: body,
        direction: 'inbound',
        sender_name: customer?.name || from,
        sender_contact: from,
        metadata: { messageSid, to },
      });

    if (msgError) {
      console.error('Error saving message:', msgError);
      throw msgError;
    }

    // Update conversation status to unread and update last_message_at
    await supabase
      .from('conversations')
      .update({ 
        status: 'unread',
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    console.log('Successfully processed inbound SMS');

    // Return empty TwiML response (we don't auto-reply)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Still return 200 to Twilio to prevent retries
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
    );
  }
});
