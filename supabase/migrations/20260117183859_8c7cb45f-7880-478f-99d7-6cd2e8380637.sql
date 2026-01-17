-- =============================================
-- PHONE TREE SYSTEM - DATABASE SCHEMA
-- =============================================

-- Create enums for phone tree system
CREATE TYPE phone_menu_action_type AS ENUM (
  'forward_call',
  'voicemail', 
  'submenu',
  'sms_reply',
  'play_message',
  'business_hours_check'
);

CREATE TYPE call_direction AS ENUM ('inbound', 'outbound');

CREATE TYPE auto_reply_trigger AS ENUM ('missed_call', 'after_hours', 'busy', 'voicemail');

-- =============================================
-- PHONE MENUS (IVR Configuration)
-- =============================================
CREATE TABLE public.phone_menus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  greeting_text TEXT,
  greeting_audio_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  timeout_seconds INTEGER NOT NULL DEFAULT 10,
  timeout_action TEXT NOT NULL DEFAULT 'repeat',
  invalid_input_message TEXT DEFAULT 'Sorry, that was not a valid option. Please try again.',
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_menus ENABLE ROW LEVEL SECURITY;

-- RLS Policies for phone_menus
CREATE POLICY "Admin/manager can manage phone menus"
  ON public.phone_menus FOR ALL
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated users can view phone menus"
  ON public.phone_menus FOR SELECT
  USING (true);

-- =============================================
-- PHONE MENU OPTIONS (IVR Key Mappings)
-- =============================================
CREATE TABLE public.phone_menu_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID NOT NULL REFERENCES public.phone_menus(id) ON DELETE CASCADE,
  digit TEXT NOT NULL CHECK (digit IN ('0','1','2','3','4','5','6','7','8','9','*','#')),
  label TEXT NOT NULL,
  action_type phone_menu_action_type NOT NULL,
  action_data JSONB DEFAULT '{}',
  announcement TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(menu_id, digit)
);

-- Enable RLS
ALTER TABLE public.phone_menu_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies for phone_menu_options
CREATE POLICY "Admin/manager can manage phone menu options"
  ON public.phone_menu_options FOR ALL
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated users can view phone menu options"
  ON public.phone_menu_options FOR SELECT
  USING (true);

-- =============================================
-- AUTO REPLY SETTINGS (Missed Call SMS)
-- =============================================
CREATE TABLE public.auto_reply_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active BOOLEAN NOT NULL DEFAULT false,
  trigger_type auto_reply_trigger NOT NULL DEFAULT 'missed_call',
  message_template TEXT NOT NULL DEFAULT 'Thanks for calling! We missed your call but will get back to you shortly.',
  delay_seconds INTEGER NOT NULL DEFAULT 0,
  business_hours_only BOOLEAN NOT NULL DEFAULT false,
  include_callback_link BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auto_reply_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for auto_reply_settings
CREATE POLICY "Admin/manager can manage auto reply settings"
  ON public.auto_reply_settings FOR ALL
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated users can view auto reply settings"
  ON public.auto_reply_settings FOR SELECT
  USING (true);

-- =============================================
-- VOICEMAIL SETTINGS
-- =============================================
CREATE TABLE public.voicemail_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active BOOLEAN NOT NULL DEFAULT true,
  greeting_text TEXT DEFAULT 'You have reached our voicemail. Please leave a message after the beep and we will return your call as soon as possible.',
  greeting_audio_url TEXT,
  max_length_seconds INTEGER NOT NULL DEFAULT 120,
  transcribe BOOLEAN NOT NULL DEFAULT true,
  notification_email TEXT,
  notification_sms TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voicemail_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voicemail_settings
CREATE POLICY "Admin/manager can manage voicemail settings"
  ON public.voicemail_settings FOR ALL
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated users can view voicemail settings"
  ON public.voicemail_settings FOR SELECT
  USING (true);

-- =============================================
-- CALL LOG (All Call History)
-- =============================================
CREATE TABLE public.call_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_sid TEXT UNIQUE,
  direction call_direction NOT NULL DEFAULT 'inbound',
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  status TEXT NOT NULL DEFAULT 'initiated',
  duration_seconds INTEGER,
  menu_path JSONB DEFAULT '[]',
  answered_by UUID REFERENCES public.profiles(id),
  forwarded_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.call_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_log
CREATE POLICY "Admin/manager can manage call log"
  ON public.call_log FOR ALL
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated users can view call log"
  ON public.call_log FOR SELECT
  USING (true);

-- =============================================
-- CALL RECORDINGS
-- =============================================
CREATE TABLE public.call_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_log_id UUID REFERENCES public.call_log(id) ON DELETE SET NULL,
  call_sid TEXT,
  recording_sid TEXT UNIQUE,
  recording_url TEXT NOT NULL,
  duration_seconds INTEGER,
  caller_phone TEXT,
  customer_id UUID REFERENCES public.customers(id),
  direction call_direction NOT NULL DEFAULT 'inbound',
  status TEXT NOT NULL DEFAULT 'processing',
  transcription TEXT,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_recordings
CREATE POLICY "Admin/manager can manage call recordings"
  ON public.call_recordings FOR ALL
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated users can view call recordings"
  ON public.call_recordings FOR SELECT
  USING (true);

-- =============================================
-- VOICEMAILS
-- =============================================
CREATE TABLE public.voicemails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_log_id UUID REFERENCES public.call_log(id) ON DELETE SET NULL,
  call_sid TEXT,
  caller_phone TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  recording_sid TEXT,
  recording_url TEXT,
  duration_seconds INTEGER,
  transcription TEXT,
  is_listened BOOLEAN NOT NULL DEFAULT false,
  listened_by UUID REFERENCES public.profiles(id),
  listened_at TIMESTAMP WITH TIME ZONE,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voicemails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voicemails
CREATE POLICY "Admin/manager can manage voicemails"
  ON public.voicemails FOR ALL
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated users can view voicemails"
  ON public.voicemails FOR SELECT
  USING (true);

-- =============================================
-- BUSINESS HOURS
-- =============================================
CREATE TABLE public.business_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open BOOLEAN NOT NULL DEFAULT true,
  open_time TIME NOT NULL DEFAULT '09:00:00',
  close_time TIME NOT NULL DEFAULT '17:00:00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(day_of_week)
);

-- Enable RLS
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_hours
CREATE POLICY "Admin/manager can manage business hours"
  ON public.business_hours FOR ALL
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated users can view business hours"
  ON public.business_hours FOR SELECT
  USING (true);

-- Insert default business hours (Mon-Fri 9-5)
INSERT INTO public.business_hours (day_of_week, is_open, open_time, close_time) VALUES
  (0, false, '09:00:00', '17:00:00'), -- Sunday closed
  (1, true, '09:00:00', '17:00:00'),  -- Monday
  (2, true, '09:00:00', '17:00:00'),  -- Tuesday
  (3, true, '09:00:00', '17:00:00'),  -- Wednesday
  (4, true, '09:00:00', '17:00:00'),  -- Thursday
  (5, true, '09:00:00', '17:00:00'),  -- Friday
  (6, false, '09:00:00', '17:00:00'); -- Saturday closed

-- =============================================
-- STORAGE BUCKET FOR RECORDINGS
-- =============================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('call-recordings', 'call-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for call-recordings bucket
CREATE POLICY "Authenticated users can view recordings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'call-recordings' AND auth.role() = 'authenticated');

CREATE POLICY "Admin/manager can upload recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'call-recordings' AND is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager can delete recordings"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'call-recordings' AND is_admin_or_manager(auth.uid()));

-- =============================================
-- UPDATE TRIGGERS
-- =============================================
CREATE TRIGGER update_phone_menus_updated_at
  BEFORE UPDATE ON public.phone_menus
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_auto_reply_settings_updated_at
  BEFORE UPDATE ON public.auto_reply_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voicemail_settings_updated_at
  BEFORE UPDATE ON public.voicemail_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_hours_updated_at
  BEFORE UPDATE ON public.business_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_call_log_customer ON public.call_log(customer_id);
CREATE INDEX idx_call_log_created_at ON public.call_log(created_at DESC);
CREATE INDEX idx_call_log_call_sid ON public.call_log(call_sid);
CREATE INDEX idx_call_log_from_number ON public.call_log(from_number);
CREATE INDEX idx_voicemails_customer ON public.voicemails(customer_id);
CREATE INDEX idx_voicemails_created_at ON public.voicemails(created_at DESC);
CREATE INDEX idx_voicemails_is_listened ON public.voicemails(is_listened);
CREATE INDEX idx_call_recordings_call_log ON public.call_recordings(call_log_id);
CREATE INDEX idx_phone_menu_options_menu ON public.phone_menu_options(menu_id);

-- =============================================
-- HELPER FUNCTION: Check if currently within business hours
-- =============================================
CREATE OR REPLACE FUNCTION public.is_within_business_hours(check_timezone TEXT DEFAULT 'America/Chicago')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_day INTEGER;
  current_time_local TIME;
  hours_record RECORD;
BEGIN
  -- Get current day and time in the specified timezone
  SELECT EXTRACT(DOW FROM now() AT TIME ZONE check_timezone)::INTEGER INTO current_day;
  SELECT (now() AT TIME ZONE check_timezone)::TIME INTO current_time_local;
  
  -- Get business hours for current day
  SELECT * INTO hours_record FROM public.business_hours WHERE day_of_week = current_day;
  
  IF NOT FOUND OR NOT hours_record.is_open THEN
    RETURN FALSE;
  END IF;
  
  RETURN current_time_local >= hours_record.open_time 
     AND current_time_local <= hours_record.close_time;
END;
$$;

-- Enable realtime for call_log and voicemails
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voicemails;