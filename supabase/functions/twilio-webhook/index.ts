import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse form data from Twilio webhook
    const formData = await req.formData();
    
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    console.log('Received inbound SMS:', { from, to, body: body?.substring(0, 50), messageSid });

    if (!from || !body) {
      console.error('Missing required fields');
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
        }
      );
    }

    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize phone number (remove +1 prefix for matching)
    const normalizedPhone = from.replace(/^\+1/, '').replace(/\D/g, '');
    
    // Try to find a customer with this phone number
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, phone')
      .or(`phone.ilike.%${normalizedPhone}%,phone.ilike.%${from}%`)
      .limit(1);

    const customer = customers?.[0];
    console.log('Found customer:', customer);

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
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Still return 200 to Twilio to prevent retries
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      }
    );
  }
});
