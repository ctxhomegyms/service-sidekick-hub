import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  job_id: string;
  notification_type: "job_scheduled" | "technician_en_route" | "job_completed";
}

// Email templates (HTML)
const emailTemplates = {
  job_scheduled: {
    subject: "Your Service Appointment is Scheduled",
    getBody: (job: any, technician: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Service Appointment Confirmed</h2>
        <p>Hello ${job.customer?.name || "Valued Customer"},</p>
        <p>Your service appointment has been scheduled:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Service:</strong> ${job.title}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${job.scheduled_date || "TBD"}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${job.scheduled_time?.slice(0, 5) || "TBD"}</p>
          ${technician ? `<p style="margin: 5px 0;"><strong>Technician:</strong> ${technician.full_name}</p>` : ""}
          <p style="margin: 5px 0;"><strong>Address:</strong> ${[job.address, job.city].filter(Boolean).join(", ") || "On file"}</p>
        </div>
        <p>We'll notify you when your technician is on the way.</p>
        <p style="color: #666; font-size: 14px;">If you need to reschedule, please contact us.</p>
      </div>
    `,
  },
  technician_en_route: {
    subject: "Your Technician is On the Way!",
    getBody: (job: any, technician: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">🚗 Technician En Route</h2>
        <p>Hello ${job.customer?.name || "Valued Customer"},</p>
        <p>Great news! Your technician is now on the way to your location.</p>
        <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Service:</strong> ${job.title}</p>
          ${technician ? `<p style="margin: 5px 0;"><strong>Technician:</strong> ${technician.full_name}</p>` : ""}
          <p style="margin: 5px 0;"><strong>Address:</strong> ${[job.address, job.city].filter(Boolean).join(", ") || "On file"}</p>
        </div>
        <p>Please ensure someone is available at the service location.</p>
      </div>
    `,
  },
  job_completed: {
    subject: "Service Completed - Thank You!",
    getBody: (job: any, technician: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">✅ Service Completed</h2>
        <p>Hello ${job.customer?.name || "Valued Customer"},</p>
        <p>Your service has been completed successfully.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Service:</strong> ${job.title}</p>
          ${technician ? `<p style="margin: 5px 0;"><strong>Technician:</strong> ${technician.full_name}</p>` : ""}
          ${job.completion_notes ? `<p style="margin: 5px 0;"><strong>Notes:</strong> ${job.completion_notes}</p>` : ""}
        </div>
        <p>Thank you for choosing our services. We appreciate your business!</p>
        <p style="color: #666; font-size: 14px;">If you have any questions about the service performed, please don't hesitate to contact us.</p>
      </div>
    `,
  },
};

// SMS templates (concise text-only)
const smsTemplates = {
  job_scheduled: (job: any, technician: any) => 
    `Hi ${job.customer?.name || "there"}! Your service "${job.title}" is confirmed for ${job.scheduled_date || "TBD"} at ${job.scheduled_time?.slice(0, 5) || "TBD"}.${technician ? ` Tech: ${technician.full_name}.` : ""} We'll notify you when they're on the way.`,
  
  technician_en_route: (job: any, technician: any) => 
    `🚗 ${technician?.full_name || "Your technician"} is on the way to ${job.address || "your location"}! Please ensure someone is available to greet them.`,
  
  job_completed: (job: any, _technician: any) => 
    `✅ Service complete! Thank you for choosing us, ${job.customer?.name || "valued customer"}. We appreciate your business! Questions? Just reply to this message.`,
};

// Helper to format phone number for Twilio
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+${cleaned}`;
  }
  return phone.startsWith("+") ? phone : `+${cleaned}`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { job_id, notification_type }: NotificationRequest = await req.json();
    console.log(`Processing ${notification_type} notification for job ${job_id}`);

    // Fetch job details with customer
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select(`*, customer:customers(*)`)
      .eq("id", job_id)
      .maybeSingle();

    if (jobError || !job) {
      console.error("Job fetch error:", jobError);
      throw new Error(jobError?.message || "Job not found");
    }

    if (!job.customer) {
      console.log("No customer associated with job");
      return new Response(JSON.stringify({ message: "No customer to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check notification preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("customer_id", job.customer.id)
      .maybeSingle();

    const emailPrefKey = `email_${notification_type}`;
    const smsPrefKey = `sms_${notification_type}`;
    
    // Default to email enabled, SMS disabled if no preferences set
    const shouldSendEmail = prefs ? prefs[emailPrefKey] !== false : true;
    const shouldSendSms = prefs ? prefs[smsPrefKey] === true : false;

    // Fetch technician details if assigned
    let technician = null;
    if (job.assigned_technician_id) {
      const { data: techData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", job.assigned_technician_id)
        .maybeSingle();
      technician = techData;
    }

    const results: { email?: any; sms?: any } = {};

    // Send Email if enabled and customer has email
    if (shouldSendEmail && job.customer.email) {
      console.log(`Sending ${notification_type} email to ${job.customer.email}`);
      
      const template = emailTemplates[notification_type];
      const emailHtml = template.getBody(job, technician);

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Service Updates <onboarding@resend.dev>",
          to: [job.customer.email],
          subject: template.subject,
          html: emailHtml,
        }),
      });

      const emailResult = await emailResponse.json();
      console.log("Email result:", emailResult);

      if (emailResponse.ok) {
        results.email = emailResult;
        
        // Log the email notification
        await supabase.from("notification_log").insert({
          job_id: job_id,
          customer_id: job.customer.id,
          notification_type: notification_type,
          channel: "email",
          recipient: job.customer.email,
          status: "sent",
          sent_at: new Date().toISOString(),
        });
      } else {
        console.error("Email send failed:", emailResult);
        await supabase.from("notification_log").insert({
          job_id: job_id,
          customer_id: job.customer.id,
          notification_type: notification_type,
          channel: "email",
          recipient: job.customer.email,
          status: "failed",
          error_message: emailResult.message || "Failed to send email",
        });
      }
    } else {
      console.log(`Skipping email: enabled=${shouldSendEmail}, hasEmail=${!!job.customer.email}`);
    }

    // Send SMS if enabled and customer has phone
    if (shouldSendSms && job.customer.phone) {
      console.log(`Sending ${notification_type} SMS to ${job.customer.phone}`);

      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
        console.error("Twilio credentials not configured");
      } else {
        const smsMessage = smsTemplates[notification_type](job, technician);
        const formattedPhone = formatPhoneNumber(job.customer.phone);

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const authHeader = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

        const smsResponse = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authHeader}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: formattedPhone,
            From: TWILIO_PHONE_NUMBER,
            Body: smsMessage,
          }),
        });

        const smsResult = await smsResponse.json();
        console.log("SMS result:", smsResult);

        if (smsResponse.ok) {
          results.sms = smsResult;

          // Log the SMS notification
          await supabase.from("notification_log").insert({
            job_id: job_id,
            customer_id: job.customer.id,
            notification_type: notification_type,
            channel: "sms",
            recipient: formattedPhone,
            status: "sent",
            sent_at: new Date().toISOString(),
          });
        } else {
          console.error("SMS send failed:", smsResult);
          await supabase.from("notification_log").insert({
            job_id: job_id,
            customer_id: job.customer.id,
            notification_type: notification_type,
            channel: "sms",
            recipient: formattedPhone,
            status: "failed",
            error_message: smsResult.message || "Failed to send SMS",
          });
        }
      }
    } else {
      console.log(`Skipping SMS: enabled=${shouldSendSms}, hasPhone=${!!job.customer.phone}`);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
