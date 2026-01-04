-- Add time tracking columns to jobs table
ALTER TABLE public.jobs 
ADD COLUMN started_at TIMESTAMPTZ,
ADD COLUMN actual_duration_minutes INTEGER;

-- Add reminder preference columns to notification_preferences table
ALTER TABLE public.notification_preferences
ADD COLUMN sms_reminder_24h BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN sms_reminder_1h BOOLEAN NOT NULL DEFAULT true;