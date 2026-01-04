import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
}

interface ShopifyAddress {
  address1: string;
  address2: string | null;
  city: string;
  province: string;
  zip: string;
  country: string;
}

interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  sku: string;
  variant_title: string | null;
}

interface ShopifyOrder {
  id: number;
  name: string; // Order number like #1001
  email: string;
  created_at: string;
  note: string | null;
  tags: string;
  customer: ShopifyCustomer | null;
  shipping_address: ShopifyAddress | null;
  billing_address: ShopifyAddress | null;
  line_items: ShopifyLineItem[];
  fulfillment_status: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const shopifyAccessToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
    const shopifyStoreDomain = Deno.env.get('SHOPIFY_STORE_DOMAIN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!shopifyAccessToken || !shopifyStoreDomain) {
      throw new Error('Missing Shopify credentials');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting Shopify order sync...');
    console.log(`Store domain: ${shopifyStoreDomain}`);

    // Fetch orders with LD tag from Shopify
    // Using the Admin API to get orders
    const shopifyApiUrl = `https://${shopifyStoreDomain}/admin/api/2024-01/orders.json?status=any&limit=50`;
    
    const shopifyResponse = await fetch(shopifyApiUrl, {
      headers: {
        'X-Shopify-Access-Token': shopifyAccessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error('Shopify API error:', errorText);
      throw new Error(`Shopify API error: ${shopifyResponse.status} - ${errorText}`);
    }

    const shopifyData = await shopifyResponse.json();
    const allOrders: ShopifyOrder[] = shopifyData.orders || [];
    
    console.log(`Fetched ${allOrders.length} total orders from Shopify`);

    // Filter orders that have the "LD" tag
    const ldOrders = allOrders.filter(order => {
      const tags = order.tags.split(',').map(t => t.trim().toUpperCase());
      return tags.includes('LD');
    });

    console.log(`Found ${ldOrders.length} orders with LD tag`);

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const order of ldOrders) {
      try {
        // Check if order already imported
        const { data: existingOrder } = await supabase
          .from('shopify_orders')
          .select('id')
          .eq('shopify_order_id', order.id.toString())
          .maybeSingle();

        if (existingOrder) {
          console.log(`Order ${order.name} already imported, skipping`);
          skippedCount++;
          continue;
        }

        // Find or create customer
        let customerId: string | null = null;

        if (order.customer) {
          // First try to find by shopify_customer_id
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('shopify_customer_id', order.customer.id.toString())
            .maybeSingle();

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            // Try to find by email
            const { data: customerByEmail } = await supabase
              .from('customers')
              .select('id')
              .eq('email', order.customer.email)
              .maybeSingle();

            if (customerByEmail) {
              // Update with shopify_customer_id
              await supabase
                .from('customers')
                .update({ shopify_customer_id: order.customer.id.toString() })
                .eq('id', customerByEmail.id);
              customerId = customerByEmail.id;
            } else {
              // Create new customer
              const address = order.shipping_address || order.billing_address;
              const { data: newCustomer, error: customerError } = await supabase
                .from('customers')
                .insert({
                  name: `${order.customer.first_name} ${order.customer.last_name}`.trim(),
                  email: order.customer.email,
                  phone: order.customer.phone,
                  shopify_customer_id: order.customer.id.toString(),
                  address: address?.address1 || null,
                  city: address?.city || null,
                  state: address?.province || null,
                  zip_code: address?.zip || null,
                })
                .select('id')
                .single();

              if (customerError) {
                console.error('Error creating customer:', customerError);
              } else {
                customerId = newCustomer.id;
              }
            }
          }
        }

        // Get address from order
        const address = order.shipping_address || order.billing_address;

        // Create line items description
        const lineItemsDescription = order.line_items
          .map(item => `${item.quantity}x ${item.title}${item.variant_title ? ` (${item.variant_title})` : ''}`)
          .join('\n');

        // Create job
        const { data: newJob, error: jobError } = await supabase
          .from('jobs')
          .insert({
            title: `Delivery - Order ${order.name}`,
            description: lineItemsDescription,
            customer_id: customerId,
            status: 'pending',
            priority: 'medium',
            address: address?.address1 || null,
            city: address?.city || null,
            state: address?.province || null,
            zip_code: address?.zip || null,
            instructions: order.note || null,
          })
          .select('id')
          .single();

        if (jobError) {
          console.error('Error creating job:', jobError);
          errors.push(`Order ${order.name}: Failed to create job - ${jobError.message}`);
          continue;
        }

        // Create job line items
        for (let i = 0; i < order.line_items.length; i++) {
          const item = order.line_items[i];
          await supabase
            .from('job_line_items')
            .insert({
              job_id: newJob.id,
              description: `${item.title}${item.variant_title ? ` - ${item.variant_title}` : ''}`,
              quantity: item.quantity,
              unit_price: parseFloat(item.price),
              sort_order: i,
            });
        }

        // Find or create "Shopify Import" tag
        let { data: shopifyTag } = await supabase
          .from('tags')
          .select('id')
          .eq('name', 'Shopify Import')
          .maybeSingle();

        if (!shopifyTag) {
          const { data: newTag } = await supabase
            .from('tags')
            .insert({ name: 'Shopify Import', color: '#96bf48' })
            .select('id')
            .single();
          shopifyTag = newTag;
        }

        if (shopifyTag) {
          await supabase
            .from('job_tags')
            .insert({ job_id: newJob.id, tag_id: shopifyTag.id });
        }

        // Record the sync
        await supabase
          .from('shopify_orders')
          .insert({
            shopify_order_id: order.id.toString(),
            shopify_order_number: order.name,
            job_id: newJob.id,
            order_data: order,
          });

        console.log(`Successfully imported order ${order.name} as job ${newJob.id}`);
        importedCount++;

      } catch (orderError: unknown) {
        const errorMessage = orderError instanceof Error ? orderError.message : 'Unknown error';
        console.error(`Error processing order ${order.name}:`, orderError);
        errors.push(`Order ${order.name}: ${errorMessage}`);
      }
    }

    const result = {
      success: true,
      totalOrders: allOrders.length,
      ldOrdersFound: ldOrders.length,
      imported: importedCount,
      skipped: skippedCount,
      errors: errors,
      syncedAt: new Date().toISOString(),
    };

    console.log('Sync completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        syncedAt: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
