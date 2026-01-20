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
      console.warn('Invalid Twilio signature - rejecting recording callback request');
      return validation.error!;
    }

    const params = validation.params!;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const recordingSid = params.RecordingSid || '';
    const recordingUrl = params.RecordingUrl || '';
    const recordingStatus = params.RecordingStatus || '';
    const recordingDuration = parseInt(params.RecordingDuration || '0') || 0;
    const callSid = params.CallSid || '';

    console.log('Recording callback:', { recordingSid, recordingStatus, recordingDuration, callSid });

    if (!recordingSid) {
      return new Response(JSON.stringify({ error: 'Missing recording SID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the call log to find customer info
    const { data: callLog } = await supabase
      .from('call_log')
      .select('id, customer_id, from_number, direction')
      .eq('call_sid', callSid)
      .single();

    // Check if this is a voicemail (already saved) or a call recording
    const { data: existingVoicemail } = await supabase
      .from('voicemails')
      .select('id')
      .eq('recording_sid', recordingSid)
      .single();

    if (existingVoicemail) {
      // Update existing voicemail record with final status
      console.log('Updating existing voicemail record');
      
      await supabase
        .from('voicemails')
        .update({
          recording_url: recordingUrl,
          duration_seconds: recordingDuration,
        })
        .eq('recording_sid', recordingSid);
    } else {
      // This is a call recording (not voicemail)
      console.log('Creating call recording record');
      
      const { error: recordingError } = await supabase
        .from('call_recordings')
        .upsert({
          call_log_id: callLog?.id || null,
          call_sid: callSid,
          recording_sid: recordingSid,
          recording_url: recordingUrl,
          duration_seconds: recordingDuration,
          caller_phone: callLog?.from_number,
          customer_id: callLog?.customer_id,
          direction: callLog?.direction || 'inbound',
          status: recordingStatus,
        }, {
          onConflict: 'recording_sid'
        });

      if (recordingError) {
        console.error('Error saving call recording:', recordingError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error processing recording callback:', error);
    
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 200, // Return 200 to prevent Twilio retries
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
