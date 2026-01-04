-- Create job_types table
CREATE TABLE public.job_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_tags junction table
CREATE TABLE public.job_tags (
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, tag_id)
);

-- Create job_line_items table
CREATE TABLE public.job_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create custom_field_definitions table
CREATE TABLE public.custom_field_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  options JSONB,
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_custom_field_values table
CREATE TABLE public.job_custom_field_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
  value JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (job_id, field_id)
);

-- Create job_crew junction table for multiple technicians
CREATE TABLE public.job_crew (
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, technician_id)
);

-- Alter jobs table to add new columns
ALTER TABLE public.jobs
ADD COLUMN job_number TEXT UNIQUE,
ADD COLUMN job_type_id UUID REFERENCES public.job_types(id) ON DELETE SET NULL,
ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN recurrence_pattern JSONB,
ADD COLUMN parent_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
ADD COLUMN end_date DATE,
ADD COLUMN end_time TIME WITHOUT TIME ZONE,
ADD COLUMN instructions TEXT;

-- Create sequence for job numbers
CREATE SEQUENCE IF NOT EXISTS job_number_seq START 1;

-- Create function to generate job number
CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.job_number IS NULL THEN
    NEW.job_number := 'JOB-' || LPAD(nextval('job_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto job number
CREATE TRIGGER set_job_number
BEFORE INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.generate_job_number();

-- Enable RLS on all new tables
ALTER TABLE public.job_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_crew ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_types
CREATE POLICY "Admin/dispatcher can manage job types" ON public.job_types
FOR ALL USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Authenticated users can view job types" ON public.job_types
FOR SELECT USING (true);

-- RLS policies for tags
CREATE POLICY "Admin/dispatcher can manage tags" ON public.tags
FOR ALL USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Authenticated users can view tags" ON public.tags
FOR SELECT USING (true);

-- RLS policies for job_tags
CREATE POLICY "Admin/dispatcher can manage job tags" ON public.job_tags
FOR ALL USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Authenticated users can view job tags" ON public.job_tags
FOR SELECT USING (true);

-- RLS policies for job_line_items
CREATE POLICY "Admin/dispatcher can manage line items" ON public.job_line_items
FOR ALL USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Authenticated users can view line items" ON public.job_line_items
FOR SELECT USING (true);

-- RLS policies for custom_field_definitions
CREATE POLICY "Admin/dispatcher can manage custom field definitions" ON public.custom_field_definitions
FOR ALL USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Authenticated users can view custom field definitions" ON public.custom_field_definitions
FOR SELECT USING (true);

-- RLS policies for job_custom_field_values
CREATE POLICY "Admin/dispatcher can manage custom field values" ON public.job_custom_field_values
FOR ALL USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Authenticated users can view custom field values" ON public.job_custom_field_values
FOR SELECT USING (true);

-- RLS policies for job_crew
CREATE POLICY "Admin/dispatcher can manage job crew" ON public.job_crew
FOR ALL USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Authenticated users can view job crew" ON public.job_crew
FOR SELECT USING (true);