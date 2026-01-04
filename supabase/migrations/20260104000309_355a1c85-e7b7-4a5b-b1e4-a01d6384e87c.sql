-- Add time window fields to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS time_window_start TIME,
ADD COLUMN IF NOT EXISTS time_window_end TIME;

-- Add comment for documentation
COMMENT ON COLUMN public.jobs.time_window_start IS 'Customer availability window start time';
COMMENT ON COLUMN public.jobs.time_window_end IS 'Customer availability window end time';