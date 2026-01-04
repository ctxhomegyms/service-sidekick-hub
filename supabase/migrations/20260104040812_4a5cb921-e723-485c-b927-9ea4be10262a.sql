-- Fix jobs.assigned_technician_id to reference public.profiles instead of auth.users
-- This enables safe joins from jobs -> profiles and avoids relying on auth schema in app queries.

ALTER TABLE public.jobs
DROP CONSTRAINT IF EXISTS jobs_assigned_technician_id_fkey;

ALTER TABLE public.jobs
ADD CONSTRAINT jobs_assigned_technician_id_fkey
FOREIGN KEY (assigned_technician_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;