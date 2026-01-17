import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DoorMeasurement {
  door_name: string;
  width_inches: number;
  photo_base64?: string;
}

interface PickupRequestData {
  // Contact info
  name: string;
  email: string;
  phone?: string;
  sms_consent?: boolean;
  
  // Equipment details
  items_description: string;
  item_location: string;
  
  // Access logistics
  floor_level: string;
  has_elevator: boolean;
  has_stairs: boolean;
  stairs_description?: string;
  
  // Door measurements
  door_measurements: DoorMeasurement[];
  
  // Address
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  
  // Payment
  preferred_payment_method: string;
  payment_username: string;
  
  // Equipment photos (base64)
  equipment_photos: { name: string; base64: string; type: string }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const data: PickupRequestData = await req.json();
    
    // Validate required fields
    if (!data.name || !data.email || !data.items_description || !data.item_location ||
        !data.floor_level || !data.address || !data.city || !data.state || !data.zip_code ||
        !data.preferred_payment_method || !data.payment_username) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // 1. Create or find customer
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();
    
    let customerId: string;
    
    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Update customer info
      await supabase
        .from("customers")
        .update({
          name: data.name,
          phone: data.phone || null,
          address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zip_code,
          sms_consent: data.sms_consent || false,
          sms_consent_date: data.sms_consent ? new Date().toISOString() : null,
        })
        .eq("id", customerId);
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zip_code,
          sms_consent: data.sms_consent || false,
          sms_consent_date: data.sms_consent ? new Date().toISOString() : null,
        })
        .select("id")
        .single();
      
      if (customerError) {
        console.error("Customer creation error:", customerError);
        return new Response(
          JSON.stringify({ error: "Failed to create customer" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      customerId = newCustomer.id;
    }
    
    // 2. Find pickup job type
    const { data: jobType } = await supabase
      .from("job_types")
      .select("id")
      .eq("name", "Equipment Removal")
      .maybeSingle();
    
    // 3. Create job with high priority (time-sensitive)
    const fullAddress = data.address2 
      ? `${data.address}, ${data.address2}, ${data.city}, ${data.state} ${data.zip_code}`
      : `${data.address}, ${data.city}, ${data.state} ${data.zip_code}`;
    
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
        title: `Pickup Request - ${data.name}`,
        description: `Equipment pickup request:\n\n${data.items_description}\n\nPayment: ${data.preferred_payment_method} - ${data.payment_username}`,
        status: "pending",
        priority: "high",
        service_category: "pickup",
        customer_id: customerId,
        job_type_id: jobType?.id || null,
        address: data.address,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code,
        instructions: `Floor: ${data.floor_level}\nAccess: ${data.has_elevator ? 'Elevator available' : ''}${data.has_stairs ? (data.has_elevator ? ', ' : '') + 'Stairs' : ''}\n${data.stairs_description ? 'Stairs info: ' + data.stairs_description : ''}\n\nItem location: ${data.item_location}`,
      })
      .select("id")
      .single();
    
    if (jobError) {
      console.error("Job creation error:", jobError);
      return new Response(
        JSON.stringify({ error: "Failed to create job" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // 4. Create pickup_requests record
    const doorWidths = data.door_measurements.map(d => ({
      door_name: d.door_name,
      width_inches: d.width_inches,
    }));
    
    const { error: pickupError } = await supabase
      .from("pickup_requests")
      .insert({
        job_id: job.id,
        items_description: data.items_description,
        item_location: data.item_location,
        floor_level: data.floor_level,
        has_elevator: data.has_elevator,
        has_stairs: data.has_stairs,
        stairs_description: data.stairs_description || null,
        door_widths: doorWidths,
        preferred_payment_method: data.preferred_payment_method,
        payment_username: data.payment_username,
      });
    
    if (pickupError) {
      console.error("Pickup request creation error:", pickupError);
    }
    
    // 5. Upload equipment photos
    for (let i = 0; i < data.equipment_photos.length; i++) {
      const photo = data.equipment_photos[i];
      const base64Data = photo.base64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      const fileName = `${job.id}/equipment-${i + 1}-${Date.now()}.${photo.type.split('/')[1] || 'jpg'}`;
      
      const { error: uploadError } = await supabase.storage
        .from("job-attachments")
        .upload(fileName, buffer, {
          contentType: photo.type,
          upsert: false,
        });
      
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("job-attachments")
          .getPublicUrl(fileName);
        
        // Create attachment record
        await supabase.from("job_attachments").insert({
          job_id: job.id,
          file_name: photo.name || `equipment-photo-${i + 1}`,
          file_type: photo.type,
          file_url: urlData.publicUrl,
          description: "Equipment photo",
          uploaded_by: customerId, // Use customer ID as a reference
        });
      }
    }
    
    // 6. Upload door photos
    for (let i = 0; i < data.door_measurements.length; i++) {
      const door = data.door_measurements[i];
      if (door.photo_base64) {
        const base64Data = door.photo_base64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const fileName = `${job.id}/door-${door.door_name.replace(/\s+/g, '-')}-${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from("job-attachments")
          .upload(fileName, buffer, {
            contentType: "image/jpeg",
            upsert: false,
          });
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("job-attachments")
            .getPublicUrl(fileName);
          
          await supabase.from("job_attachments").insert({
            job_id: job.id,
            file_name: `Door: ${door.door_name} (${door.width_inches}" wide)`,
            file_type: "image/jpeg",
            file_url: urlData.publicUrl,
            description: `Door measurement: ${door.door_name} - ${door.width_inches} inches`,
            uploaded_by: customerId,
          });
        }
      }
    }
    
    // 7. Log activity
    await supabase.from("job_activities").insert({
      job_id: job.id,
      activity_type: "pickup_request_submitted",
      description: `Pickup request submitted by ${data.name} via online form`,
      metadata: {
        customer_name: data.name,
        customer_email: data.email,
        floor_level: data.floor_level,
        payment_method: data.preferred_payment_method,
      },
    });
    
    // 8. Send confirmation email to customer
    try {
      await supabase.functions.invoke("send-email", {
        body: {
          to: data.email,
          subject: "Pickup Request Received - We'll Be In Touch Soon!",
          html: `
            <h2>Thank you for your pickup request, ${data.name}!</h2>
            <p>We've received your equipment pickup request and will review it shortly.</p>
            <p><strong>What happens next:</strong></p>
            <ul>
              <li>Our team will review your request within 1-2 business hours</li>
              <li>We'll contact you to schedule a pickup time that works for you</li>
              <li>On pickup day, our team will arrive, assess, and collect your equipment</li>
            </ul>
            <p><strong>Items for pickup:</strong></p>
            <pre>${data.items_description}</pre>
            <p><strong>Location:</strong> ${fullAddress}</p>
            <p>If you have any questions, please reply to this email or call us.</p>
            <p>Thank you for choosing us!</p>
          `,
        },
      });
    } catch (emailError) {
      console.error("Confirmation email error:", emailError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Pickup request submitted successfully",
        job_id: job.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error processing pickup request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
