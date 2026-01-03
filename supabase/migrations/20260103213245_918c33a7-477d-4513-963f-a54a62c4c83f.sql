-- Create storage bucket for job photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true);

-- Storage policies for job-photos bucket
CREATE POLICY "Authenticated users can view job photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-photos');

CREATE POLICY "Authenticated users can upload job photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'job-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own uploads"
ON storage.objects FOR UPDATE
USING (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage bucket for signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-signatures', 'job-signatures', true);

-- Storage policies for signatures
CREATE POLICY "Authenticated users can view signatures"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-signatures');

CREATE POLICY "Authenticated users can upload signatures"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'job-signatures' AND auth.role() = 'authenticated');

-- Create job_photos table
CREATE TABLE public.job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'during', 'after')),
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view job photos"
ON public.job_photos FOR SELECT
USING (true);

CREATE POLICY "Technicians can upload photos to their jobs"
ON public.job_photos FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by AND
  EXISTS (
    SELECT 1 FROM jobs 
    WHERE jobs.id = job_id 
    AND (jobs.assigned_technician_id = auth.uid() OR is_admin_or_dispatcher(auth.uid()))
  )
);

CREATE POLICY "Admin/dispatcher can manage all photos"
ON public.job_photos FOR ALL
USING (is_admin_or_dispatcher(auth.uid()));

-- Create job_signatures table
CREATE TABLE public.job_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE UNIQUE,
  signature_url TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view signatures"
ON public.job_signatures FOR SELECT
USING (true);

CREATE POLICY "Technicians can add signatures to their jobs"
ON public.job_signatures FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs 
    WHERE jobs.id = job_id 
    AND jobs.assigned_technician_id = auth.uid()
  )
);

CREATE POLICY "Admin/dispatcher can manage signatures"
ON public.job_signatures FOR ALL
USING (is_admin_or_dispatcher(auth.uid()));

-- Create job_notes table for timestamped notes
CREATE TABLE public.job_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view notes"
ON public.job_notes FOR SELECT
USING (true);

CREATE POLICY "Technicians can add notes to their jobs"
ON public.job_notes FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM jobs 
    WHERE jobs.id = job_id 
    AND (jobs.assigned_technician_id = auth.uid() OR is_admin_or_dispatcher(auth.uid()))
  )
);

CREATE POLICY "Admin/dispatcher can manage notes"
ON public.job_notes FOR ALL
USING (is_admin_or_dispatcher(auth.uid()));

-- Indexes
CREATE INDEX idx_job_photos_job_id ON public.job_photos(job_id);
CREATE INDEX idx_job_notes_job_id ON public.job_notes(job_id);
CREATE INDEX idx_job_signatures_job_id ON public.job_signatures(job_id);