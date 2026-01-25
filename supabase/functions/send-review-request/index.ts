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

interface ReviewRequestConfig {
  review_url?: string; // Optional custom review URL (Google, Yelp, etc.)
  delay_hours?: number; // Hours after completion to send (default: 24)
}

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

    // Parse optional config from request body
    let config: ReviewRequestConfig = { delay_hours: 24 };
    let specificJobId: string | null = null;
    
    try {
      const body = await req.json();
      config = { ...config, ...body };
      specificJobId = body.job_id || null;
    } catch {
      // No body or invalid JSON, use defaults
    }

    console.log("Processing review requests with config:", config, "specificJobId:", specificJobId);

    let eligibleJobs: any[] = [];

    if (specificJobId) {
      // Manual trigger for a specific job
      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .select(`
          id,
          title,
          completed_at,
          review_request_sent_at,
          customer:customers(id, name, email, phone, sms_consent)
        `)
        .eq("id", specificJobId)
        .eq("status", "completed")
        .maybeSingle();

      if (jobError) {
        console.error("Error fetching job:", jobError);
        throw new Error(jobError.message);
      }

      if (!job) {
        return new Response(
          JSON.stringify({ success: false, error: "Job not found or not completed" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (job.review_request_sent_at) {
        return new Response(
          JSON.stringify({ success: false, error: "Review request already sent for this job" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      eligibleJobs = [job];
    } else {
      // Scheduled/batch trigger - find jobs eligible based on delay
      const delayHours = config.delay_hours || 24;
      const now = new Date();
      const minCompletedAt = new Date(now.getTime() - (delayHours + 1) * 60 * 60 * 1000);
      const maxCompletedAt = new Date(now.getTime() - delayHours * 60 * 60 * 1000);

      const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select(`
          id,
          title,
          completed_at,
          review_request_sent_at,
          customer:customers(id, name, email, phone, sms_consent)
        `)
        .eq("status", "completed")
        .is("review_request_sent_at", null)
        .gte("completed_at", minCompletedAt.toISOString())
        .lte("completed_at", maxCompletedAt.toISOString());

      if (jobsError) {
        console.error("Error fetching jobs:", jobsError);
        throw new Error(jobsError.message);
      }

      eligibleJobs = jobs || [];
    }

    console.log(`Found ${eligibleJobs.length} jobs eligible for review request`);

    const results: any[] = [];

    for (const job of eligibleJobs || []) {
      if (!job.customer) {
        console.log(`Job ${job.id} has no customer, skipping`);
        continue;
      }

      const customer = job.customer as any;
      console.log(`Processing review request for job ${job.id}, customer: ${customer.name}`);

      const reviewUrl = config.review_url || ""; // Empty if not configured
      const emailSent = false;
      const smsSent = false;
      let emailResult: any = null;
      let smsResult: any = null;

      // Send email if customer has email
      if (customer.email && RESEND_API_KEY) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">⭐ How Did We Do?</h2>
            <p>Hello ${customer.name || "Valued Customer"},</p>
            <p>Thank you for choosing us for your recent service: <strong>${job.title}</strong></p>
            <p>We'd love to hear about your experience! Your feedback helps us improve and helps other customers find quality service.</p>
            ${reviewUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${reviewUrl}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Leave a Review
                </a>
              </div>
            ` : `
              <p>We truly appreciate your business and hope to serve you again!</p>
            `}
            <p style="color: #666; font-size: 14px;">Thank you for your time!</p>
          </div>
        `;

        try {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Service Updates <onboarding@resend.dev>",
              to: [customer.email],
              subject: "⭐ How was your experience? We'd love your feedback!",
              html: emailHtml,
            }),
          });

          emailResult = await emailResponse.json();
          console.log("Review email result:", emailResult);

          if (emailResponse.ok) {
            await supabase.from("notification_log").insert({
              job_id: job.id,
              customer_id: customer.id,
              notification_type: "review_request",
              channel: "email",
              recipient: customer.email,
              status: "sent",
              sent_at: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error("Failed to send review email:", error);
        }
      }

      // Send SMS if customer has phone and consent
      if (customer.phone && customer.sms_consent && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
        const smsMessage = reviewUrl
          ? `⭐ Hi ${customer.name || "there"}! Thanks for choosing us for "${job.title}". We'd love your feedback! Leave a review: ${reviewUrl}`
          : `⭐ Hi ${customer.name || "there"}! Thanks for choosing us for "${job.title}". We'd love to hear how we did! Reply to share your feedback.`;

        try {
          const formattedPhone = formatPhoneNumber(customer.phone);
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

          smsResult = await smsResponse.json();
          console.log("Review SMS result:", smsResult);

          if (smsResponse.ok) {
            await supabase.from("notification_log").insert({
              job_id: job.id,
              customer_id: customer.id,
              notification_type: "review_request",
              channel: "sms",
              recipient: formattedPhone,
              status: "sent",
              sent_at: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error("Failed to send review SMS:", error);
        }
      }

      // Mark job as review request sent
      await supabase
        .from("jobs")
        .update({ review_request_sent_at: new Date().toISOString() })
        .eq("id", job.id);

      results.push({
        job_id: job.id,
        customer_name: customer.name,
        email_sent: emailResult?.id ? true : false,
        sms_sent: smsResult?.sid ? true : false,
      });
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-review-request function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
