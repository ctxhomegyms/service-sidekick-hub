import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  job_id: string;
  notification_type: "job_scheduled" | "technician_en_route" | "job_completed";
}

const notificationTemplates = {
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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
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
      .select(`
        *,
        customer:customers(*)
      `)
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

    // Default to sending if no preferences set
    const prefKey = `email_${notification_type}` as keyof typeof prefs;
    const shouldSendEmail = prefs ? prefs[prefKey] !== false : true;

    if (!shouldSendEmail) {
      console.log(`Email notifications disabled for ${notification_type}`);
      return new Response(JSON.stringify({ message: "Notification disabled by preference" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!job.customer.email) {
      console.log("Customer has no email address");
      return new Response(JSON.stringify({ message: "No email address" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

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

    // Get email template
    const template = notificationTemplates[notification_type];
    const emailHtml = template.getBody(job, technician);

    // Send email via Resend API
    console.log(`Sending ${notification_type} email to ${job.customer.email}`);
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
    console.log("Email sent:", emailResult);

    if (!emailResponse.ok) {
      throw new Error(emailResult.message || "Failed to send email");
    }

    console.log("Email sent:", emailResponse);

    // Log the notification
    await supabase.from("notification_log").insert({
      job_id: job_id,
      customer_id: job.customer.id,
      notification_type: notification_type,
      channel: "email",
      recipient: job.customer.email,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
