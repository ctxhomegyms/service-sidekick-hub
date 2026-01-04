import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  fullName: string;
  email: string;
  phone: string;
  role: "manager" | "technician";
  invitedBy: string;
  appUrl: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing required environment variables");
      throw new Error("Server configuration error");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("Received invitation request:", JSON.stringify(body));

    const { fullName, email, phone, role, invitedBy, appUrl }: InvitationRequest = body;

    if (!email || !role || !invitedBy) {
      console.error("Missing required fields:", { email: !!email, role: !!role, invitedBy: !!invitedBy });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Creating invitation for ${email} as ${role}`);

    // Check if invitation already exists
    const { data: existingInvite, error: checkError } = await supabase
      .from("invitations")
      .select("*")
      .eq("email", email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing invitation:", checkError);
      throw checkError;
    }

    if (existingInvite) {
      console.log("Active invitation already exists for:", email);
      return new Response(
        JSON.stringify({ error: "An active invitation already exists for this email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (profileError) {
      console.error("Error checking existing profile:", profileError);
      throw profileError;
    }

    if (existingProfile) {
      console.log("User already exists:", email);
      return new Response(
        JSON.stringify({ error: "A user with this email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create invitation with full_name and phone
    const { data: invitation, error: inviteError } = await supabase
      .from("invitations")
      .insert({
        email,
        role,
        invited_by: invitedBy,
        full_name: fullName || null,
        phone: phone || null,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      throw inviteError;
    }

    console.log(`Invitation created with token: ${invitation.token}`);

    // Get inviter's name
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", invitedBy)
      .single();

    const inviterName = inviterProfile?.full_name || "An administrator";
    const inviteLink = `${appUrl}/auth?invite=${invitation.token}`;
    const roleLabel = role === "manager" ? "Manager" : "Technician";

    // Send email if Resend is configured
    if (resendApiKey) {
      console.log("Sending invitation email via Resend...");
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "FieldFlow <noreply@resend.dev>",
          to: [email],
          subject: "You've been invited to join FieldFlow",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1a1a1a;">You're Invited!</h1>
              <p>Hi ${fullName || 'there'},</p>
              <p>${inviterName} has invited you to join FieldFlow as a <strong>${roleLabel}</strong>.</p>
              <p>Click the button below to create your account:</p>
              <a href="${inviteLink}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Accept Invitation
              </a>
              <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="color: #999; font-size: 12px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error("Failed to send email:", errorText);
      } else {
        console.log("Invitation email sent successfully");
      }
    } else {
      console.log("RESEND_API_KEY not configured, skipping email");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation: { 
          id: invitation.id, 
          email: invitation.email,
          role: invitation.role,
          expires_at: invitation.expires_at,
          token: invitation.token
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-invitation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
