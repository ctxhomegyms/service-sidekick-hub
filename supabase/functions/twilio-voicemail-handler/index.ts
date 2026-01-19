import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateTwilioRequest } from "../_shared/twilio-validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate Twilio signature
    const validation = await validateTwilioRequest(req);
    if (!validation.valid) {
      console.error('Invalid Twilio signature - rejecting voicemail webhook');
      return validation.error!;
    }

    const { params } = validation;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const callLogId = url.searchParams.get('call_log_id');

    const callSid = params?.CallSid || '';
    const from = params?.From || '';
    const recordingUrl = params?.RecordingUrl || '';
    const recordingSid = params?.RecordingSid || '';
    const recordingDuration = parseInt(params?.RecordingDuration || '0') || 0;

    console.log('Voicemail handler:', { callSid, from, recordingUrl, recordingSid, recordingDuration });

    // Check for duplicate voicemail (idempotency)
    if (recordingSid) {
      const { data: existingVoicemail } = await supabase
        .from('voicemails')
        .select('id')
        .eq('recording_sid', recordingSid)
        .maybeSingle();

      if (existingVoicemail) {
        console.log('Duplicate voicemail detected, skipping:', recordingSid);
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
        );
      }
    }

    // If this is a direct call without recording (initial voicemail prompt)
    if (!recordingUrl) {
      console.log('Showing voicemail prompt');
      
      // Get voicemail settings
      const { data: voicemailSettings } = await supabase
        .from('voicemail_settings')
        .select('*')
        .limit(1)
        .single();

      const greeting = voicemailSettings?.greeting_text || 
        "You've reached our voicemail. Please leave a message after the beep and we will return your call as soon as possible.";
      const maxLength = voicemailSettings?.max_length_seconds || 120;
      const transcribe = voicemailSettings?.transcribe ? 'true' : 'false';

      let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
      
      if (voicemailSettings?.greeting_audio_url) {
        twiml += `<Play>${voicemailSettings.greeting_audio_url}</Play>`;
      } else {
        twiml += `<Say voice="Polly.Joanna">${greeting}</Say>`;
      }
      
      twiml += `<Record maxLength="${maxLength}" transcribe="${transcribe}" `;
      twiml += `action="${supabaseUrl}/functions/v1/twilio-voicemail-handler?call_log_id=${callLogId || ''}" `;
      twiml += `recordingStatusCallback="${supabaseUrl}/functions/v1/twilio-recording-callback" />`;
      twiml += `<Say voice="Polly.Joanna">We did not receive your message. Goodbye.</Say>`;
      twiml += '</Response>';

      return new Response(twiml, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }

    // Recording received - save voicemail
    console.log('Saving voicemail recording');

    // Normalize phone for customer matching
    const normalizedPhone = from?.replace(/^\+1/, '').replace(/\D/g, '') || '';

    // Try to find customer
    let customerId = null;
    if (normalizedPhone) {
      const { data: customers } = await supabase
        .from('customers')
        .select('id')
        .or(`phone.ilike.%${normalizedPhone}%,phone.ilike.%${from}%`)
        .limit(1);

      customerId = customers?.[0]?.id || null;
    }

    // Create voicemail record
    const { data: voicemail, error: vmError } = await supabase
      .from('voicemails')
      .insert({
        call_log_id: callLogId || null,
        call_sid: callSid,
        caller_phone: from,
        customer_id: customerId,
        recording_sid: recordingSid,
        recording_url: recordingUrl,
        duration_seconds: recordingDuration,
        is_listened: false,
      })
      .select('id')
      .single();

    if (vmError) {
      console.error('Error saving voicemail:', vmError);
    } else {
      console.log('Voicemail saved:', voicemail.id);
    }

    // Update call log status
    if (callLogId) {
      await supabase
        .from('call_log')
        .update({ status: 'voicemail' })
        .eq('id', callLogId);
    }

    // Get voicemail settings for notifications
    const { data: settings } = await supabase
      .from('voicemail_settings')
      .select('notification_email, notification_sms')
      .limit(1)
      .single();

    // Send email notification if configured
    if (settings?.notification_email) {
      console.log('Sending email notification to:', settings.notification_email);
      
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: settings.notification_email,
            subject: `New Voicemail from ${from}`,
            html: `
              <h2>New Voicemail Received</h2>
              <p><strong>From:</strong> ${from}</p>
              <p><strong>Duration:</strong> ${recordingDuration} seconds</p>
              <p><strong>Received:</strong> ${new Date().toLocaleString()}</p>
              <p><a href="${recordingUrl}">Listen to Voicemail</a></p>
            `
          }
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }
    }

    // Send SMS notification if configured
    if (settings?.notification_sms) {
      console.log('Sending SMS notification to:', settings.notification_sms);
      
      try {
        await supabase.functions.invoke('send-sms', {
          body: {
            to: settings.notification_sms,
            message: `New voicemail from ${from} (${recordingDuration}s). Check your voicemail inbox.`
          }
        });
      } catch (smsError) {
        console.error('Failed to send SMS notification:', smsError);
      }
    }

    // Return TwiML to end the call
    const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>' +
      '<Say voice="Polly.Joanna">Thank you for your message. Goodbye.</Say>' +
      '</Response>';

    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Error handling voicemail:', error);
    
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Thank you. Goodbye.</Say></Response>',
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
    );
  }
});
