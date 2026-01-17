-- Add service_category to jobs table for pickup/delivery distinction
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT 'delivery';

-- Create pickup_requests table for pickup-specific logistics
CREATE TABLE public.pickup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  
  -- Equipment details
  items_description TEXT NOT NULL,
  item_location TEXT NOT NULL,
  
  -- Access logistics
  floor_level TEXT NOT NULL,
  has_elevator BOOLEAN DEFAULT false,
  has_stairs BOOLEAN DEFAULT false,
  stairs_description TEXT,
  
  -- Door information
  door_widths JSONB DEFAULT '[]'::jsonb,
  
  -- Payment preferences
  preferred_payment_method TEXT,
  payment_username TEXT,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pickup_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for pickup_requests (admin/manager can view all, technicians see their assigned jobs)
CREATE POLICY "Admins and managers can view all pickup requests"
ON public.pickup_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Technicians can view pickup requests for their jobs"
ON public.pickup_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = pickup_requests.job_id
    AND j.assigned_technician_id = auth.uid()
  )
);

CREATE POLICY "Admins and managers can insert pickup requests"
ON public.pickup_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can update pickup requests"
ON public.pickup_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_pickup_requests_updated_at
BEFORE UPDATE ON public.pickup_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster job lookups
CREATE INDEX idx_pickup_requests_job_id ON public.pickup_requests(job_id);
CREATE INDEX idx_jobs_service_category ON public.jobs(service_category);