-- Phase 1: Scheduling Conflict Prevention
-- Function to check technician availability and detect double-booking
CREATE OR REPLACE FUNCTION check_technician_availability(
  p_technician_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_job_id UUID DEFAULT NULL
)
RETURNS TABLE (
  job_id UUID,
  job_title TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  end_time TIME,
  customer_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.scheduled_date::DATE,
    j.scheduled_time::TIME,
    (j.scheduled_time::TIME + (COALESCE(j.estimated_duration_minutes, 60) || ' minutes')::INTERVAL)::TIME,
    c.name
  FROM jobs j
  LEFT JOIN customers c ON j.customer_id = c.id
  WHERE j.assigned_technician_id = p_technician_id
    AND j.scheduled_date = p_date
    AND j.status NOT IN ('completed', 'cancelled')
    AND (p_exclude_job_id IS NULL OR j.id != p_exclude_job_id)
    AND j.scheduled_time IS NOT NULL
    AND (
      -- Check for overlap: new job starts during existing job
      (p_start_time >= j.scheduled_time::TIME 
       AND p_start_time < (j.scheduled_time::TIME + (COALESCE(j.estimated_duration_minutes, 60) || ' minutes')::INTERVAL)::TIME)
      OR
      -- Check for overlap: new job ends during existing job
      (p_end_time > j.scheduled_time::TIME 
       AND p_end_time <= (j.scheduled_time::TIME + (COALESCE(j.estimated_duration_minutes, 60) || ' minutes')::INTERVAL)::TIME)
      OR
      -- Check for overlap: new job completely contains existing job
      (p_start_time <= j.scheduled_time::TIME 
       AND p_end_time >= (j.scheduled_time::TIME + (COALESCE(j.estimated_duration_minutes, 60) || ' minutes')::INTERVAL)::TIME)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Phase 2: Phone Number Normalization
-- Function to normalize phone numbers to E.164 format
CREATE OR REPLACE FUNCTION normalize_phone_number(phone TEXT)
RETURNS TEXT AS $$
DECLARE
  digits TEXT;
BEGIN
  IF phone IS NULL OR phone = '' THEN
    RETURN NULL;
  END IF;
  
  -- Extract only digits
  digits := regexp_replace(phone, '[^0-9]', '', 'g');
  
  -- Handle US numbers
  IF length(digits) = 10 THEN
    RETURN '+1' || digits;
  ELSIF length(digits) = 11 AND substring(digits, 1, 1) = '1' THEN
    RETURN '+' || digits;
  ELSIF length(digits) >= 10 AND substring(digits, 1, 1) != '+' THEN
    RETURN '+' || digits;
  END IF;
  
  RETURN phone; -- Return original if can't normalize
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Trigger to auto-normalize phone on customer insert/update
CREATE OR REPLACE FUNCTION normalize_customer_phone_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    NEW.phone := normalize_phone_number(NEW.phone);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS normalize_customer_phone ON customers;
CREATE TRIGGER normalize_customer_phone
  BEFORE INSERT OR UPDATE OF phone ON customers
  FOR EACH ROW
  EXECUTE FUNCTION normalize_customer_phone_trigger();

-- Phase 2: Duplicate Customer Detection Function
CREATE OR REPLACE FUNCTION find_duplicate_customers(
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  email TEXT,
  match_type TEXT
) AS $$
DECLARE
  normalized_phone TEXT;
BEGIN
  normalized_phone := normalize_phone_number(p_phone);
  
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    CASE 
      WHEN normalized_phone IS NOT NULL AND c.phone = normalized_phone THEN 'phone'
      WHEN p_email IS NOT NULL AND LOWER(c.email) = LOWER(p_email) THEN 'email'
      ELSE 'unknown'
    END as match_type
  FROM customers c
  WHERE (p_exclude_id IS NULL OR c.id != p_exclude_id)
    AND (
      (normalized_phone IS NOT NULL AND c.phone = normalized_phone)
      OR (p_email IS NOT NULL AND p_email != '' AND LOWER(c.email) = LOWER(p_email))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Phase 3: Add require_checklist_completion to job_types
ALTER TABLE job_types ADD COLUMN IF NOT EXISTS require_checklist_completion BOOLEAN DEFAULT false;

-- Phase 5: Create company_settings table for timezone and other settings
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_timezone TEXT DEFAULT 'America/Chicago',
  business_name TEXT,
  business_phone TEXT,
  business_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings if none exist
INSERT INTO company_settings (business_timezone)
SELECT 'America/Chicago'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- Enable RLS on company_settings
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings
CREATE POLICY "Authenticated users can read company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins/managers can update settings
CREATE POLICY "Admins and managers can update company settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (is_admin_or_manager(auth.uid()));

-- Phase 6: Add version column for optimistic locking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Trigger to auto-increment version on update
CREATE OR REPLACE FUNCTION increment_job_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version := COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS increment_job_version_trigger ON jobs;
CREATE TRIGGER increment_job_version_trigger
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION increment_job_version();

-- Normalize existing phone numbers
UPDATE customers 
SET phone = normalize_phone_number(phone) 
WHERE phone IS NOT NULL AND phone != '';