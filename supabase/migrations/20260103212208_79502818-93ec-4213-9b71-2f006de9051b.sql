-- Add 'en_route' status to job_status enum
ALTER TYPE job_status ADD VALUE 'en_route' BEFORE 'in_progress';

-- Create skills table
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create technician_skills junction table
CREATE TABLE public.technician_skills (
  technician_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (technician_id, skill_id)
);

-- Create job_required_skills junction table
CREATE TABLE public.job_required_skills (
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, skill_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_required_skills ENABLE ROW LEVEL SECURITY;

-- Skills policies (viewable by all authenticated, manageable by admin/dispatcher)
CREATE POLICY "Authenticated users can view skills"
ON public.skills FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin/dispatcher can manage skills"
ON public.skills FOR ALL
TO authenticated
USING (public.is_admin_or_dispatcher(auth.uid()));

-- Technician skills policies
CREATE POLICY "Authenticated users can view technician skills"
ON public.technician_skills FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin/dispatcher can manage technician skills"
ON public.technician_skills FOR ALL
TO authenticated
USING (public.is_admin_or_dispatcher(auth.uid()));

-- Job required skills policies
CREATE POLICY "Authenticated users can view job required skills"
ON public.job_required_skills FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin/dispatcher can manage job required skills"
ON public.job_required_skills FOR ALL
TO authenticated
USING (public.is_admin_or_dispatcher(auth.uid()));

-- Insert some default skills
INSERT INTO public.skills (name, color) VALUES
  ('HVAC', '#3B82F6'),
  ('Electrical', '#EAB308'),
  ('Plumbing', '#22C55E'),
  ('Appliance Repair', '#8B5CF6'),
  ('General Maintenance', '#6B7280');