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
      console.warn('Invalid Twilio signature - rejecting call status request');
      return validation.error!;
    }

    const params = validation.params!;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const callLogId = url.searchParams.get('call_log_id');
    
    const callSid = params.CallSid || '';
    const callStatus = params.CallStatus || '';
    const callDuration = parseInt(params.CallDuration || '0') || 0;
    const dialCallStatus = params.DialCallStatus || '';
    const from = params.From || '';

    console.log('Call status update:', { callSid, callStatus, callDuration, dialCallStatus, callLogId });

    // Map Twilio status to our status
    let status = callStatus;
    if (dialCallStatus) {
      // For forwarded calls, use the dial status
      status = dialCallStatus === 'completed' ? 'completed' : 
               dialCallStatus === 'busy' ? 'busy' :
               dialCallStatus === 'no-answer' ? 'missed' :
               dialCallStatus === 'failed' ? 'failed' : dialCallStatus;
    }

    // Update call log
    if (callLogId) {
      const { error: updateError } = await supabase
        .from('call_log')
        .update({
          status: status,
          duration_seconds: callDuration,
          ended_at: new Date().toISOString(),
        })
        .eq('id', callLogId);

      if (updateError) {
        console.error('Error updating call log:', updateError);
      }
    } else if (callSid) {
      // Try to find by call SID
      const { error: updateError } = await supabase
        .from('call_log')
        .update({
          status: status,
          duration_seconds: callDuration,
          ended_at: new Date().toISOString(),
        })
        .eq('call_sid', callSid);

      if (updateError) {
        console.error('Error updating call log by SID:', updateError);
      }
    }

    // Check if we need to trigger auto-reply for missed calls
    if (status === 'missed' || status === 'no-answer' || dialCallStatus === 'no-answer') {
      console.log('Missed call detected, checking auto-reply settings');
      
      const { data: autoReplySettings } = await supabase
        .from('auto_reply_settings')
        .select('*')
        .eq('trigger_type', 'missed_call')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (autoReplySettings && from) {
        console.log('Auto-reply enabled, sending SMS');
        
        // Check business hours if required
        let shouldSend = true;
        if (autoReplySettings.business_hours_only) {
          const { data: isOpen } = await supabase.rpc('is_within_business_hours');
          shouldSend = isOpen === true;
        }

        if (shouldSend) {
          // Delay sending if configured
          const delay = autoReplySettings.delay_seconds || 0;
          
          if (delay > 0) {
            console.log(`Delaying auto-reply by ${delay} seconds`);
            await new Promise(resolve => setTimeout(resolve, delay * 1000));
          }

          try {
            await supabase.functions.invoke('send-sms', {
              body: {
                to: from,
                message: autoReplySettings.message_template,
              }
            });
            console.log('Auto-reply SMS sent successfully');
          } catch (smsError) {
            console.error('Failed to send auto-reply SMS:', smsError);
          }
        }
      }
    }

    // Generate TwiML response based on dial outcome
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    
    if (dialCallStatus === 'no-answer' || dialCallStatus === 'busy' || dialCallStatus === 'failed') {
      // Forward failed, offer voicemail
      twiml += '<Say voice="Polly.Joanna">We were unable to connect your call. Please leave a message after the beep.</Say>';
      twiml += `<Redirect>${supabaseUrl}/functions/v1/twilio-voicemail-handler?call_log_id=${callLogId || ''}</Redirect>`;
    }
    
    twiml += '</Response>';

    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Error processing call status:', error);
    
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
    );
  }
});
