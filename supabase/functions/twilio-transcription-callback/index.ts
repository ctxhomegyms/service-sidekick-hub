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
    
    const recordingSid = formData.get('RecordingSid') as string;
    const transcriptionText = formData.get('TranscriptionText') as string;
    const transcriptionStatus = formData.get('TranscriptionStatus') as string;

    console.log('Transcription callback:', { recordingSid, transcriptionStatus, textLength: transcriptionText?.length });

    if (!recordingSid) {
      return new Response(JSON.stringify({ error: 'Missing recording SID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (transcriptionStatus !== 'completed' || !transcriptionText) {
      console.log('Transcription not completed or empty');
      return new Response(JSON.stringify({ success: true, status: transcriptionStatus }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Try to update voicemail transcription
    const { data: voicemail, error: vmError } = await supabase
      .from('voicemails')
      .update({ transcription: transcriptionText })
      .eq('recording_sid', recordingSid)
      .select('id, caller_phone')
      .single();

    if (vmError) {
      console.log('No matching voicemail, trying call recordings');
      
      // Try call recordings
      const { error: recError } = await supabase
        .from('call_recordings')
        .update({ transcription: transcriptionText })
        .eq('recording_sid', recordingSid);

      if (recError) {
        console.error('Error updating call recording transcription:', recError);
      }
    } else {
      console.log('Updated voicemail transcription:', voicemail.id);
      
      // Send notification with transcription
      const { data: settings } = await supabase
        .from('voicemail_settings')
        .select('notification_email')
        .limit(1)
        .single();

      if (settings?.notification_email) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: settings.notification_email,
              subject: `Voicemail Transcription from ${voicemail.caller_phone}`,
              html: `
                <h2>Voicemail Transcription</h2>
                <p><strong>From:</strong> ${voicemail.caller_phone}</p>
                <p><strong>Message:</strong></p>
                <blockquote>${transcriptionText}</blockquote>
              `
            }
          });
        } catch (emailError) {
          console.error('Failed to send transcription email:', emailError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error processing transcription callback:', error);
    
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
