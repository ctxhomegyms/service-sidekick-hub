import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DemoRequestInput {
  name: string;
  email: string;
  company: string;
  message?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, company, message }: DemoRequestInput = await req.json();

    // Validate required fields
    if (!name || !email || !company) {
      console.error("Missing required fields:", { name: !!name, email: !!email, company: !!company });
      return new Response(
        JSON.stringify({ error: "Missing required fields: name, email, and company are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("Invalid email format:", email);
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Processing demo request from:", name, email, company);

    // Create Supabase client with service role for insert
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert demo request into database
    const { data: demoRequest, error: insertError } = await supabase
      .from("demo_requests")
      .insert({
        name,
        email,
        company,
        message: message || null,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error("Failed to save demo request");
    }

    console.log("Demo request saved:", demoRequest.id);

    // Send notification email to sales team
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const NOTIFICATION_EMAIL = Deno.env.get("NOTIFICATION_EMAIL") || "hello@fixagym.com";

    if (RESEND_API_KEY) {
      try {
        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎯 New Demo Request</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 18px;">Contact Information</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 100px;">Name:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 500;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                  <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #dc2626;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Company:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 500;">${company}</td>
                </tr>
              </table>
              
              ${message ? `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 14px;">Message:</h3>
                  <p style="margin: 0; color: #374151; line-height: 1.6; background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                    ${message.replace(/\n/g, '<br>')}
                  </p>
                </div>
              ` : ''}
            </div>
            
            <div style="background: #111827; padding: 16px 24px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This demo request was submitted via the FixAGym Field website.
              </p>
            </div>
          </div>
        `;

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "FixAGym Field <onboarding@resend.dev>",
            to: [NOTIFICATION_EMAIL],
            subject: `🎯 New Demo Request from ${company}`,
            html: emailHtml,
          }),
        });

        const emailResult = await emailResponse.json();

        if (!emailResponse.ok) {
          console.error("Failed to send notification email:", emailResult);
        } else {
          console.log("Notification email sent successfully:", emailResult.id);
        }
      } catch (emailError) {
        // Don't fail the request if email fails - the lead is still saved
        console.error("Error sending notification email:", emailError);
      }
    } else {
      console.warn("RESEND_API_KEY not configured, skipping notification email");
    }

    // Send confirmation email to the requester
    if (RESEND_API_KEY) {
      try {
        const confirmationHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">FixAGym Field</h1>
            </div>
            
            <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px;">Thanks for reaching out, ${name}!</h2>
              
              <p style="color: #374151; line-height: 1.6; margin: 0 0 16px 0;">
                We received your demo request for <strong>${company}</strong> and we're excited to show you how FixAGym Field can transform your fitness equipment delivery operations.
              </p>
              
              <p style="color: #374151; line-height: 1.6; margin: 0 0 16px 0;">
                A member of our team will be in touch within 24 hours to schedule your personalized demo.
              </p>
              
              <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0;">
                <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 14px;">What to expect:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151;">
                  <li style="margin-bottom: 4px;">A 30-minute walkthrough of the platform</li>
                  <li style="margin-bottom: 4px;">Q&A tailored to your business</li>
                  <li>Custom pricing based on your needs</li>
                </ul>
              </div>
              
              <p style="color: #374151; line-height: 1.6; margin: 0;">
                In the meantime, feel free to reply to this email if you have any questions.
              </p>
            </div>
            
            <div style="background: #111827; padding: 16px 24px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} FixAGym Field. All rights reserved.
              </p>
            </div>
          </div>
        `;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "FixAGym Field <onboarding@resend.dev>",
            to: [email],
            subject: "Thanks for your demo request - FixAGym Field",
            html: confirmationHtml,
          }),
        });

        console.log("Confirmation email sent to:", email);
      } catch (confirmError) {
        console.error("Error sending confirmation email:", confirmError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Demo request submitted successfully",
        id: demoRequest.id 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error processing demo request:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process demo request" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
