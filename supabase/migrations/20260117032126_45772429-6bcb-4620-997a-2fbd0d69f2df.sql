-- Add SMS consent tracking columns to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS sms_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_consent_date timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.customers.sms_consent IS 'Explicit opt-in consent for receiving SMS messages (A2P 10DLC compliance)';
COMMENT ON COLUMN public.customers.sms_consent_date IS 'Timestamp when SMS consent was given';