-- Create technician_locations table for real-time tracking
CREATE TABLE public.technician_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  is_on_shift BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(technician_id)
);

-- Enable RLS
ALTER TABLE public.technician_locations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin/dispatcher can view all locations"
ON public.technician_locations
FOR SELECT
USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Technicians can view their own location"
ON public.technician_locations
FOR SELECT
USING (auth.uid() = technician_id);

CREATE POLICY "Technicians can manage their own location"
ON public.technician_locations
FOR ALL
USING (auth.uid() = technician_id)
WITH CHECK (auth.uid() = technician_id);

-- Enable realtime for location updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.technician_locations;

-- Add index for performance
CREATE INDEX idx_technician_locations_technician ON public.technician_locations(technician_id);
CREATE INDEX idx_technician_locations_on_shift ON public.technician_locations(is_on_shift) WHERE is_on_shift = true;