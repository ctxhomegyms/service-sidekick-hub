-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  email_job_scheduled BOOLEAN NOT NULL DEFAULT true,
  email_technician_en_route BOOLEAN NOT NULL DEFAULT true,
  email_job_completed BOOLEAN NOT NULL DEFAULT true,
  sms_job_scheduled BOOLEAN NOT NULL DEFAULT false,
  sms_technician_en_route BOOLEAN NOT NULL DEFAULT false,
  sms_job_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id)
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin/dispatcher can manage notification preferences"
ON public.notification_preferences
FOR ALL
USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Authenticated users can view notification preferences"
ON public.notification_preferences
FOR SELECT
USING (true);

-- Create notification log table to track sent notifications
CREATE TABLE public.notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'job_scheduled', 'technician_en_route', 'job_completed'
  channel TEXT NOT NULL, -- 'email', 'sms'
  recipient TEXT NOT NULL, -- email address or phone number
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin/dispatcher can manage notification logs"
ON public.notification_log
FOR ALL
USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Authenticated users can view notification logs"
ON public.notification_log
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();