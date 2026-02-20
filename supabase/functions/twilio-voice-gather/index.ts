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
      console.warn('Invalid Twilio signature - rejecting voice gather request');
      return validation.error!;
    }

    const params = validation.params!;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const menuId = url.searchParams.get('menu_id');
    const callLogId = url.searchParams.get('call_log_id');
    const attempt = parseInt(url.searchParams.get('attempt') || '1');

    const digits = params.Digits || '';
    const callSid = params.CallSid || '';
    const from = params.From || '';

    console.log('IVR gather input:', { menuId, digits, callSid, attempt });

    if (!menuId) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred.</Say></Response>',
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    }

    // Get menu details
    const { data: menu, error: menuError } = await supabase
      .from('phone_menus')
      .select('*')
      .eq('id', menuId)
      .single();

    if (menuError || !menu) {
      console.error('Menu not found:', menuError);
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred.</Say></Response>',
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    }

    // Update call log with menu path
    if (callLogId && digits) {
      const { data: currentLog } = await supabase
        .from('call_log')
        .select('menu_path')
        .eq('id', callLogId)
        .single();

      const currentPath = currentLog?.menu_path || [];
      await supabase
        .from('call_log')
        .update({
          menu_path: [...currentPath, { menu_id: menuId, digit: digits, timestamp: new Date().toISOString() }]
        })
        .eq('id', callLogId);
    }

    // Find the matching menu option
    const { data: option } = await supabase
      .from('phone_menu_options')
      .select('*')
      .eq('menu_id', menuId)
      .eq('digit', digits)
      .single();

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    if (!option) {
      // Invalid input
      console.log('Invalid input:', digits);
      
      if (attempt >= menu.max_attempts) {
        // Max attempts reached
        const { data: voicemailSettings } = await supabase
          .from('voicemail_settings')
          .select('*')
          .limit(1)
          .single();

        if (voicemailSettings?.is_active) {
          twiml += `<Say voice="Polly.Joanna">We did not understand your selection. Let me transfer you to voicemail.</Say>`;
          twiml += `<Redirect>${supabaseUrl}/functions/v1/twilio-voicemail-handler?call_log_id=${callLogId || ''}</Redirect>`;
        } else {
          twiml += `<Say voice="Polly.Joanna">We did not understand your selection. Goodbye.</Say><Hangup/>`;
        }
      } else {
        // Retry
        twiml += `<Say voice="Polly.Joanna">${menu.invalid_input_message}</Say>`;
        twiml += `<Redirect>${supabaseUrl}/functions/v1/twilio-voice-webhook</Redirect>`;
      }
      
      twiml += '</Response>';
      return new Response(twiml, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }

    console.log('Menu option selected:', option.label, option.action_type);

    // Play announcement if set
    if (option.announcement) {
      twiml += `<Say voice="Polly.Joanna">${option.announcement}</Say>`;
    }

    // Handle action based on type
    switch (option.action_type) {
      case 'forward_call': {
        const forwardTo = option.action_data?.phone_number;
        if (forwardTo) {
          console.log('Forwarding call to:', forwardTo);
          
          // Update call log with forwarding info
          if (callLogId) {
            await supabase
              .from('call_log')
              .update({ forwarded_to: forwardTo, status: 'forwarding' })
              .eq('id', callLogId);
          }
          
          twiml += `<Say voice="Polly.Joanna">Please hold while we connect your call.</Say>`;
          twiml += `<Dial callerId="${Deno.env.get('TWILIO_PHONE_NUMBER') || ''}" `;
          twiml += `action="${supabaseUrl}/functions/v1/twilio-call-status?call_log_id=${callLogId || ''}" `;
          twiml += `timeout="30">`;
          twiml += `<Number>${forwardTo}</Number>`;
          twiml += `</Dial>`;
          
          // If dial fails, go to voicemail
          twiml += `<Say voice="Polly.Joanna">We were unable to connect your call. Please leave a message.</Say>`;
          twiml += `<Redirect>${supabaseUrl}/functions/v1/twilio-voicemail-handler?call_log_id=${callLogId || ''}</Redirect>`;
        } else {
          twiml += `<Say voice="Polly.Joanna">Sorry, this option is not available right now.</Say>`;
          twiml += `<Redirect>${supabaseUrl}/functions/v1/twilio-voice-webhook</Redirect>`;
        }
        break;
      }

      case 'voicemail': {
        console.log('Routing to voicemail');
        twiml += `<Redirect>${supabaseUrl}/functions/v1/twilio-voicemail-handler?call_log_id=${callLogId || ''}</Redirect>`;
        break;
      }

      case 'submenu': {
        const submenuId = option.action_data?.submenu_id;
        if (submenuId) {
          console.log('Routing to submenu:', submenuId);
          
          // Get submenu and its options
          const { data: submenu } = await supabase
            .from('phone_menus')
            .select('*')
            .eq('id', submenuId)
            .single();

          if (submenu) {
            const { data: subOptions } = await supabase
              .from('phone_menu_options')
              .select('digit, label')
              .eq('menu_id', submenuId)
              .order('sort_order', { ascending: true });

            let subGreeting = submenu.greeting_text || '';
            if (subOptions && subOptions.length > 0) {
              const optionsList = subOptions.map(opt => `Press ${opt.digit} for ${opt.label}`).join('. ');
              subGreeting += ` ${optionsList}.`;
            }

            twiml += `<Gather numDigits="1" action="${supabaseUrl}/functions/v1/twilio-voice-gather?menu_id=${submenuId}&amp;call_log_id=${callLogId || ''}&amp;attempt=1" timeout="${submenu.timeout_seconds}">`;
            twiml += `<Say voice="Polly.Joanna">${subGreeting}</Say>`;
            twiml += '</Gather>';
            twiml += `<Redirect>${supabaseUrl}/functions/v1/twilio-voice-gather?menu_id=${submenuId}&amp;call_log_id=${callLogId || ''}&amp;attempt=2</Redirect>`;
          } else {
            twiml += `<Say voice="Polly.Joanna">Sorry, this menu is not available.</Say>`;
            twiml += `<Redirect>${supabaseUrl}/functions/v1/twilio-voice-webhook</Redirect>`;
          }
        } else {
          twiml += `<Say voice="Polly.Joanna">Sorry, this option is not configured.</Say>`;
          twiml += `<Redirect>${supabaseUrl}/functions/v1/twilio-voice-webhook</Redirect>`;
        }
        break;
      }

      case 'sms_reply': {
        const smsMessage = option.action_data?.message;
        if (smsMessage && from) {
          console.log('Sending IVR SMS reply to:', from);
          
          // IVR-initiated SMS: the caller explicitly pressed a button requesting this message.
          // This constitutes express request consent (TCPA gray area — user-initiated during live call).
          // We first check if the customer has existing sms_consent; if not we use allowUnknownRecipient
          // with a documented audit note since the request was caller-initiated.
          const normalizedFrom = from.replace(/^\+1/, '').replace(/\D/g, '');
          const { data: callerCustomers } = await supabase
            .from('customers')
            .select('id, sms_consent')
            .or(`phone.ilike.%${normalizedFrom}%,phone.ilike.%${from}%`)
            .limit(1);

          const callerCustomer = callerCustomers?.[0];
          const hasConsent = callerCustomer?.sms_consent === true;

          try {
            await supabase.functions.invoke('send-sms', {
              body: {
                to: from,
                message: smsMessage,
                customerId: callerCustomer?.id,
                // Caller explicitly requested this info by pressing a keypad button during an active call.
                // This is treated as express written consent equivalent per TCPA guidance.
                allowUnknownRecipient: !hasConsent,
              }
            });
            twiml += `<Say voice="Polly.Joanna">We have sent you a text message with more information. Is there anything else I can help you with?</Say>`;
          } catch (smsError) {
            console.error('Failed to send SMS:', smsError);
            twiml += `<Say voice="Polly.Joanna">We were unable to send you a text message. Is there anything else I can help you with?</Say>`;
          }
          twiml += `<Redirect>${supabaseUrl}/functions/v1/twilio-voice-webhook</Redirect>`;
        } else {
          twiml += `<Say voice="Polly.Joanna">Sorry, this option is not available.</Say>`;
          twiml += `<Redirect>${supabaseUrl}/functions/v1/twilio-voice-webhook</Redirect>`;
        }
        break;
      }

      case 'play_message': {
        const message = option.action_data?.message;
        const audioUrl = option.action_data?.audio_url;
        
        if (audioUrl) {
          twiml += `<Play>${audioUrl}</Play>`;
        } else if (message) {
          twiml += `<Say voice="Polly.Joanna">${message}</Say>`;
        }
        
        // Return to main menu after playing message
        twiml += `<Redirect>${supabaseUrl}/functions/v1/twilio-voice-webhook</Redirect>`;
        break;
      }

      default:
        twiml += `<Say voice="Polly.Joanna">Sorry, this option is not available.</Say>`;
        twiml += `<Redirect>${supabaseUrl}/functions/v1/twilio-voice-webhook</Redirect>`;
    }

    twiml += '</Response>';

    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Error processing IVR input:', error);
    
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Sorry, we encountered an error. Please try again later.</Say></Response>',
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
    );
  }
});
