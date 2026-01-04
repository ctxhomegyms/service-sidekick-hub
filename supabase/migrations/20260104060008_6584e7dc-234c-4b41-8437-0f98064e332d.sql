-- Create job_attachments table for storing file references
CREATE TABLE public.job_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies matching existing job-related tables pattern
CREATE POLICY "Admin/manager can manage attachments"
ON public.job_attachments
FOR ALL
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated users can view attachments"
ON public.job_attachments
FOR SELECT
USING (true);

CREATE POLICY "Technicians can upload attachments to their jobs"
ON public.job_attachments
FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by AND
  (EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = job_attachments.job_id
    AND (jobs.assigned_technician_id = auth.uid() OR is_admin_or_manager(auth.uid()))
  ))
);

-- Create storage bucket for job attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-attachments', 'job-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for job-attachments bucket
CREATE POLICY "Attachments are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'job-attachments');

CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'job-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'job-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);