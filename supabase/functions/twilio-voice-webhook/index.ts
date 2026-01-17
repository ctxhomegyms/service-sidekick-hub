import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse form data from Twilio
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callStatus = formData.get('CallStatus') as string;

    console.log('Incoming call:', { callSid, from, to, callStatus });

    if (!callSid || !from) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred.</Say></Response>',
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    }

    // Normalize phone number for customer matching
    const normalizedPhone = from.replace(/^\+1/, '').replace(/\D/g, '');

    // Try to find customer
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, phone')
      .or(`phone.ilike.%${normalizedPhone}%,phone.ilike.%${from}%`)
      .limit(1);

    const customer = customers?.[0];
    console.log('Customer match:', customer?.name || 'Unknown caller');

    // Log the call
    const { data: callLog, error: callLogError } = await supabase
      .from('call_log')
      .insert({
        call_sid: callSid,
        direction: 'inbound',
        from_number: from,
        to_number: to,
        customer_id: customer?.id || null,
        status: 'ringing',
        menu_path: [],
      })
      .select('id')
      .single();

    if (callLogError) {
      console.error('Error logging call:', callLogError);
    }

    // Check business hours
    const { data: businessTimezone } = await supabase
      .from('company_settings')
      .select('business_timezone')
      .limit(1)
      .single();

    const timezone = businessTimezone?.business_timezone || 'America/Chicago';

    const { data: isOpenData } = await supabase.rpc('is_within_business_hours', {
      check_timezone: timezone
    });

    const isWithinBusinessHours = isOpenData === true;
    console.log('Business hours check:', { isWithinBusinessHours, timezone });

    // Get default active phone menu
    const { data: menu } = await supabase
      .from('phone_menus')
      .select(`
        id,
        name,
        greeting_text,
        greeting_audio_url,
        timeout_seconds,
        timeout_action,
        invalid_input_message,
        max_attempts
      `)
      .eq('is_active', true)
      .eq('is_default', true)
      .limit(1)
      .single();

    // Get voicemail settings
    const { data: voicemailSettings } = await supabase
      .from('voicemail_settings')
      .select('*')
      .limit(1)
      .single();

    // Build TwiML response
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    // If outside business hours, go to voicemail or after-hours message
    if (!isWithinBusinessHours) {
      console.log('Outside business hours - routing to voicemail');
      
      const afterHoursMessage = "Thank you for calling. We are currently closed. Please leave a message after the beep and we will return your call during our next business day.";
      
      if (voicemailSettings?.is_active) {
        const greeting = voicemailSettings.greeting_text || afterHoursMessage;
        const maxLength = voicemailSettings.max_length_seconds || 120;
        const transcribe = voicemailSettings.transcribe ? 'true' : 'false';
        
        if (voicemailSettings.greeting_audio_url) {
          twiml += `<Play>${voicemailSettings.greeting_audio_url}</Play>`;
        } else {
          twiml += `<Say voice="Polly.Joanna">${greeting}</Say>`;
        }
        
        twiml += `<Record maxLength="${maxLength}" transcribe="${transcribe}" `;
        twiml += `action="${supabaseUrl}/functions/v1/twilio-voicemail-handler?call_log_id=${callLog?.id || ''}" `;
        twiml += `recordingStatusCallback="${supabaseUrl}/functions/v1/twilio-recording-callback" />`;
        twiml += `<Say voice="Polly.Joanna">We did not receive your message. Goodbye.</Say>`;
      } else {
        twiml += `<Say voice="Polly.Joanna">${afterHoursMessage}</Say>`;
      }
      
      twiml += '</Response>';
      
      return new Response(twiml, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }

    // Within business hours - route to IVR menu if available
    if (menu) {
      console.log('Routing to IVR menu:', menu.name);
      
      // Get menu options
      const { data: options } = await supabase
        .from('phone_menu_options')
        .select('digit, label, announcement')
        .eq('menu_id', menu.id)
        .order('sort_order', { ascending: true });

      // Build greeting with options
      let greeting = menu.greeting_text || 'Welcome. ';
      
      if (options && options.length > 0) {
        const optionsList = options.map(opt => `Press ${opt.digit} for ${opt.label}`).join('. ');
        greeting += ` ${optionsList}.`;
      }

      if (menu.greeting_audio_url) {
        twiml += `<Play>${menu.greeting_audio_url}</Play>`;
      }
      
      twiml += `<Gather numDigits="1" action="${supabaseUrl}/functions/v1/twilio-voice-gather?menu_id=${menu.id}&amp;call_log_id=${callLog?.id || ''}&amp;attempt=1" timeout="${menu.timeout_seconds}">`;
      
      if (!menu.greeting_audio_url) {
        twiml += `<Say voice="Polly.Joanna">${greeting}</Say>`;
      }
      
      twiml += '</Gather>';
      
      // Handle timeout
      if (menu.timeout_action === 'repeat') {
        twiml += `<Redirect>${supabaseUrl}/functions/v1/twilio-voice-webhook</Redirect>`;
      } else if (menu.timeout_action === 'voicemail') {
        twiml += `<Redirect>${supabaseUrl}/functions/v1/twilio-voicemail-handler?call_log_id=${callLog?.id || ''}</Redirect>`;
      } else {
        twiml += '<Say voice="Polly.Joanna">Goodbye.</Say><Hangup/>';
      }
    } else {
      // No menu configured - simple welcome message and direct to voicemail
      console.log('No IVR menu configured - going to voicemail');
      
      const defaultGreeting = voicemailSettings?.greeting_text || 
        "Thank you for calling. We are unable to take your call right now. Please leave a message after the beep.";
      
      if (voicemailSettings?.is_active) {
        const maxLength = voicemailSettings.max_length_seconds || 120;
        const transcribe = voicemailSettings.transcribe ? 'true' : 'false';
        
        twiml += `<Say voice="Polly.Joanna">${defaultGreeting}</Say>`;
        twiml += `<Record maxLength="${maxLength}" transcribe="${transcribe}" `;
        twiml += `action="${supabaseUrl}/functions/v1/twilio-voicemail-handler?call_log_id=${callLog?.id || ''}" `;
        twiml += `recordingStatusCallback="${supabaseUrl}/functions/v1/twilio-recording-callback" />`;
      } else {
        twiml += `<Say voice="Polly.Joanna">${defaultGreeting}</Say>`;
      }
    }

    twiml += '</Response>';
    
    console.log('Generated TwiML response');

    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Error processing incoming call:', error);
    
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Sorry, we encountered an error. Please try again later.</Say></Response>',
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
    );
  }
});
