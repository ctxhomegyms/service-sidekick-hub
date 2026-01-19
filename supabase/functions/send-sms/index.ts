import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  to: string;
  message: string;
  conversationId?: string;
  customerId?: string; // Optional: pass customer ID directly for faster lookup
  allowUnknownRecipient?: boolean; // Explicit opt-in to send to unknown numbers
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!accountSid || !authToken || !twilioPhoneNumber) {
      console.error("Missing Twilio credentials");
      return new Response(
        JSON.stringify({ error: "Twilio credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, message, conversationId, customerId, allowUnknownRecipient }: SMSRequest = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "Missing 'to' or 'message' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up phone number - remove any non-digit characters except +
    let cleanedPhone = to.replace(/[^\d+]/g, "");
    
    // Ensure it starts with + for international format
    if (!cleanedPhone.startsWith("+")) {
      // Assume US number if no country code
      cleanedPhone = "+1" + cleanedPhone;
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check SMS consent before sending
    let customer = null;
    
    if (customerId) {
      // If customer ID provided, look up directly
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, sms_consent")
        .eq("id", customerId)
        .single();
      
      if (!error && data) {
        customer = data;
      }
    }
    
    // If no customer found by ID, try to find by phone number
    if (!customer) {
      // Try multiple phone formats to find a match
      const phoneVariants = [
        cleanedPhone,
        cleanedPhone.replace("+1", ""),
        cleanedPhone.replace("+", ""),
      ];
      
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, sms_consent")
        .or(phoneVariants.map(p => `phone.ilike.%${p.slice(-10)}`).join(","))
        .limit(1);
      
      if (!error && data && data.length > 0) {
        customer = data[0];
      }
    }

    // Enforce SMS consent check
    if (customer) {
      if (customer.sms_consent !== true) {
        console.warn(`SMS blocked: Customer ${customer.name} (${customer.id}) has not given SMS consent`);
        return new Response(
          JSON.stringify({
            error: "SMS consent not given",
            message: "This customer has not opted in to receive SMS messages. Please obtain consent before sending.",
            customerId: customer.id,
            customerName: customer.name,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`SMS consent verified for customer: ${customer.name} (${customer.id})`);
    } else {
      // No customer found - block by default unless explicitly allowed
      if (!allowUnknownRecipient) {
        console.warn(`SMS blocked: No customer record found for phone ${cleanedPhone}`);
        return new Response(
          JSON.stringify({
            error: "Unknown recipient",
            message: "Cannot send SMS to unknown phone numbers. Create a customer record first or set allowUnknownRecipient: true for system messages.",
            phone: cleanedPhone,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.warn(`No customer found for phone ${cleanedPhone} - proceeding (allowUnknownRecipient=true)`);
    }

    console.log(`Sending SMS to ${cleanedPhone} via Twilio`);

    // Send SMS via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", cleanedPhone);
    formData.append("From", twilioPhoneNumber);
    formData.append("Body", message);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioData);
      return new Response(
        JSON.stringify({
          error: twilioData.message || "Failed to send SMS",
          code: twilioData.code,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("SMS sent successfully:", twilioData.sid);

    // Best-effort: poll status briefly to catch immediate failures (e.g. invalid/blocked numbers)
    let finalData = twilioData;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      if (twilioData?.sid) {
        const messageUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${twilioData.sid}.json`;

        for (let i = 0; i < 3; i++) {
          // Wait a bit before checking
          await sleep(900);

          const statusRes = await fetch(messageUrl, {
            method: "GET",
            headers: {
              "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
            },
          });

          if (!statusRes.ok) break;

          const statusData = await statusRes.json();
          finalData = statusData;

          // Stop polling once it leaves queued/sending
          if (statusData?.status && !["queued", "sending"].includes(statusData.status)) {
            break;
          }
        }
      }
    } catch (pollErr) {
      console.warn("Unable to poll Twilio status:", pollErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sid: finalData.sid,
        status: finalData.status,
        to: finalData.to,
        error_code: finalData.error_code ?? null,
        error_message: finalData.error_message ?? null,
        consent_verified: customer ? true : false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-sms function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});