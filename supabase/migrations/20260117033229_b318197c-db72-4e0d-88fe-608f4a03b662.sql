-- Add new notification preference columns for new notification types
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS email_job_rescheduled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS email_job_cancelled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS email_technician_assigned boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_job_rescheduled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_job_cancelled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_technician_assigned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_reminder_morning boolean DEFAULT false;

-- Add tracking column to jobs for review request
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS review_request_sent_at timestamptz;