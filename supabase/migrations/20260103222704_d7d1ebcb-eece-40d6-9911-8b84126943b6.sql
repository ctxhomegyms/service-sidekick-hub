-- Add latitude and longitude columns to jobs table for geocoded addresses
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;