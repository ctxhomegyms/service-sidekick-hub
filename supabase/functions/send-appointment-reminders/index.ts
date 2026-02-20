import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !twilioPhoneNumber) {
      console.log("Twilio credentials not configured, skipping reminders");
      return new Response(
        JSON.stringify({ message: "Twilio not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    console.log(`Running appointment reminders at ${now.toISOString()}`);

    // Get jobs scheduled within the next 25 hours
    const tomorrow = new Date(now);
    tomorrow.setHours(tomorrow.getHours() + 25);

      const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select(`
        id,
        title,
        scheduled_date,
        scheduled_time,
        address,
        city,
        state,
        customer_id,
        customers!customer_id (
          id,
          name,
          phone,
          sms_consent
        )
      `)
      .in("status", ["scheduled", "pending"])
      .not("scheduled_date", "is", null)
      .not("scheduled_time", "is", null)
      .gte("scheduled_date", now.toISOString().split("T")[0])
      .lte("scheduled_date", tomorrow.toISOString().split("T")[0]);

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
      throw jobsError;
    }

    console.log(`Found ${jobs?.length || 0} jobs to check for reminders`);

    let sentCount = 0;
    const results: any[] = [];

    for (const job of jobs || []) {
      const customer = job.customers as any;
      if (!customer?.phone) {
        console.log(`Job ${job.id}: No customer phone, skipping`);
        continue;
      }

      // TCPA compliance: skip SMS if customer has not given SMS consent
      if (customer.sms_consent !== true) {
        console.log(`Job ${job.id}: Customer ${customer.id} has not consented to SMS, skipping`);
        continue;
      }

      // Get customer notification preferences
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("sms_reminder_24h, sms_reminder_1h, sms_reminder_morning")
        .eq("customer_id", customer.id)
        .maybeSingle();

      // Default to true for legacy reminders, false for morning (opt-in)
      const smsReminder24h = prefs?.sms_reminder_24h ?? true;
      const smsReminder1h = prefs?.sms_reminder_1h ?? true;
      const smsReminderMorning = (prefs as any)?.sms_reminder_morning ?? false;

      // Calculate time until appointment
      const appointmentDate = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
      const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      console.log(`Job ${job.id}: ${hoursUntil.toFixed(1)} hours until appointment`);

      // Check for 24h reminder (between 23 and 25 hours)
      if (smsReminder24h && hoursUntil >= 23 && hoursUntil <= 25) {
        const alreadySent = await checkAlreadySent(supabase, job.id, "reminder_24h");
        if (!alreadySent) {
          const message = `Reminder: Your service appointment "${job.title}" is tomorrow at ${formatTime(job.scheduled_time)}. We look forward to seeing you!`;
          const result = await sendSMS(accountSid, authToken, twilioPhoneNumber, customer.phone, message);
          await logNotification(supabase, job.id, customer.id, "reminder_24h", customer.phone, result);
          results.push({ jobId: job.id, type: "24h", success: result.success });
          if (result.success) sentCount++;
        } else {
          console.log(`Job ${job.id}: 24h reminder already sent`);
        }
      }

      // Check for 1h reminder (between 45 minutes and 75 minutes)
      if (smsReminder1h && hoursUntil >= 0.75 && hoursUntil <= 1.25) {
        const alreadySent = await checkAlreadySent(supabase, job.id, "reminder_1h");
        if (!alreadySent) {
          const location = [job.address, job.city, job.state].filter(Boolean).join(", ");
          const message = `Your technician will arrive in about 1 hour for your "${job.title}" appointment${location ? ` at ${location}` : ""}.`;
          const result = await sendSMS(accountSid, authToken, twilioPhoneNumber, customer.phone, message);
          await logNotification(supabase, job.id, customer.id, "reminder_1h", customer.phone, result);
          results.push({ jobId: job.id, type: "1h", success: result.success });
          if (result.success) sentCount++;
        } else {
          console.log(`Job ${job.id}: 1h reminder already sent`);
        }
      }

      // Check for morning-of reminder (appointment same day, current time 7:30-8:30 AM)
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      const isAppointmentToday = job.scheduled_date === now.toISOString().split("T")[0];
      const isMorningWindow = currentHour === 7 && currentMinutes >= 30 || currentHour === 8 && currentMinutes <= 30;

      if (smsReminderMorning && isAppointmentToday && isMorningWindow && hoursUntil > 1) {
        const alreadySent = await checkAlreadySent(supabase, job.id, "reminder_morning");
        if (!alreadySent) {
          const message = `Good morning! Just a reminder: your "${job.title}" appointment is today at ${formatTime(job.scheduled_time)}. We'll notify you when your technician is on the way!`;
          const result = await sendSMS(accountSid, authToken, twilioPhoneNumber, customer.phone, message);
          await logNotification(supabase, job.id, customer.id, "reminder_morning", customer.phone, result);
          results.push({ jobId: job.id, type: "morning", success: result.success });
          if (result.success) sentCount++;
        } else {
          console.log(`Job ${job.id}: Morning reminder already sent`);
        }
      }
    }

    console.log(`Sent ${sentCount} reminders`);

    return new Response(
      JSON.stringify({ success: true, sentCount, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-appointment-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

async function checkAlreadySent(supabase: any, jobId: string, notificationType: string): Promise<boolean> {
  const { data } = await supabase
    .from("notification_log")
    .select("id")
    .eq("job_id", jobId)
    .eq("notification_type", notificationType)
    .eq("status", "sent")
    .maybeSingle();
  return !!data;
}

async function sendSMS(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  message: string
): Promise<{ success: boolean; error?: string; sid?: string }> {
  try {
    let cleanedPhone = to.replace(/[^\d+]/g, "");
    if (!cleanedPhone.startsWith("+")) {
      cleanedPhone = "+1" + cleanedPhone;
    }

    console.log(`Sending SMS to ${cleanedPhone}`);

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append("To", cleanedPhone);
    formData.append("From", from);
    formData.append("Body", message);

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Twilio error:", data);
      return { success: false, error: data.message || "Failed to send SMS" };
    }

    console.log("SMS sent successfully:", data.sid);
    return { success: true, sid: data.sid };
  } catch (error: any) {
    console.error("SMS send error:", error);
    return { success: false, error: error.message };
  }
}

async function logNotification(
  supabase: any,
  jobId: string,
  customerId: string,
  notificationType: string,
  recipient: string,
  result: { success: boolean; error?: string }
): Promise<void> {
  try {
    await supabase.from("notification_log").insert({
      job_id: jobId,
      customer_id: customerId,
      notification_type: notificationType,
      channel: "sms",
      recipient,
      status: result.success ? "sent" : "failed",
      error_message: result.error || null,
      sent_at: result.success ? new Date().toISOString() : null,
    });
  } catch (error) {
    console.error("Failed to log notification:", error);
  }
}
