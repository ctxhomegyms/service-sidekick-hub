-- Add shopify_customer_id to customers table for linking
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS shopify_customer_id text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_shopify_customer_id ON public.customers(shopify_customer_id);

-- Create shopify_orders tracking table to prevent duplicates
CREATE TABLE public.shopify_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shopify_order_id text NOT NULL UNIQUE,
  shopify_order_number text NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  order_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopify_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for shopify_orders
CREATE POLICY "Admin/manager can manage shopify orders"
ON public.shopify_orders
FOR ALL
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated users can view shopify orders"
ON public.shopify_orders
FOR SELECT
USING (true);

-- Create index for faster job lookups
CREATE INDEX IF NOT EXISTS idx_shopify_orders_job_id ON public.shopify_orders(job_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_shopify_order_id ON public.shopify_orders(shopify_order_id);