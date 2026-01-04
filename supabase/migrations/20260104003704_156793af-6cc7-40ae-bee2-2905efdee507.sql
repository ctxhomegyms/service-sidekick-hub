-- Create job_activities table to track all job-related events
CREATE TABLE public.job_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  activity_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_job_activities_job_id ON public.job_activities(job_id);
CREATE INDEX idx_job_activities_created_at ON public.job_activities(created_at DESC);

-- Enable RLS
ALTER TABLE public.job_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin/dispatcher can manage all activities"
ON public.job_activities
FOR ALL
USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Authenticated users can view activities"
ON public.job_activities
FOR SELECT
USING (true);

CREATE POLICY "Users can insert activities for jobs they have access to"
ON public.job_activities
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    is_admin_or_dispatcher(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_activities.job_id 
      AND jobs.assigned_technician_id = auth.uid()
    )
  )
);

-- Function to log job activity
CREATE OR REPLACE FUNCTION public.log_job_activity(
  _job_id uuid,
  _user_id uuid,
  _activity_type text,
  _description text,
  _metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity_id uuid;
BEGIN
  INSERT INTO public.job_activities (job_id, user_id, activity_type, description, metadata)
  VALUES (_job_id, _user_id, _activity_type, _description, _metadata)
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;

-- Trigger function for job status changes
CREATE OR REPLACE FUNCTION public.log_job_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_job_activity(
      NEW.id,
      auth.uid(),
      'status_changed',
      'Status changed from ' || OLD.status || ' to ' || NEW.status,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  
  IF OLD.assigned_technician_id IS DISTINCT FROM NEW.assigned_technician_id THEN
    PERFORM log_job_activity(
      NEW.id,
      auth.uid(),
      'assigned',
      'Technician assignment changed',
      jsonb_build_object('old_technician', OLD.assigned_technician_id, 'new_technician', NEW.assigned_technician_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for job updates
CREATE TRIGGER on_job_update_log_activity
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_job_status_change();

-- Trigger function for new job notes
CREATE OR REPLACE FUNCTION public.log_job_note_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM log_job_activity(
    NEW.job_id,
    NEW.author_id,
    'note_added',
    'Note added',
    NULL
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new notes
CREATE TRIGGER on_job_note_added_log_activity
  AFTER INSERT ON public.job_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.log_job_note_added();

-- Trigger function for photo uploads
CREATE OR REPLACE FUNCTION public.log_job_photo_uploaded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM log_job_activity(
    NEW.job_id,
    NEW.uploaded_by,
    'photo_uploaded',
    'Photo uploaded (' || NEW.photo_type || ')',
    jsonb_build_object('photo_type', NEW.photo_type)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for photo uploads
CREATE TRIGGER on_job_photo_uploaded_log_activity
  AFTER INSERT ON public.job_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.log_job_photo_uploaded();