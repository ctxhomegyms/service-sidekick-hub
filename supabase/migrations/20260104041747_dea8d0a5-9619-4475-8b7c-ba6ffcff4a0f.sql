
-- First, drop ALL policies that depend on is_admin_or_dispatcher function
DROP POLICY IF EXISTS "Admin/dispatcher can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Admin/dispatcher can manage checklist items" ON public.job_checklist_items;
DROP POLICY IF EXISTS "Admin/dispatcher can manage skills" ON public.skills;
DROP POLICY IF EXISTS "Admin/dispatcher can manage technician skills" ON public.technician_skills;
DROP POLICY IF EXISTS "Admin/dispatcher can manage job required skills" ON public.job_required_skills;
DROP POLICY IF EXISTS "Admin/dispatcher can view all locations" ON public.technician_locations;
DROP POLICY IF EXISTS "Technicians can upload photos to their jobs" ON public.job_photos;
DROP POLICY IF EXISTS "Admin/dispatcher can manage all photos" ON public.job_photos;
DROP POLICY IF EXISTS "Admin/dispatcher can manage signatures" ON public.job_signatures;
DROP POLICY IF EXISTS "Technicians can add notes to their jobs" ON public.job_notes;
DROP POLICY IF EXISTS "Admin/dispatcher can manage notes" ON public.job_notes;
DROP POLICY IF EXISTS "Admin/dispatcher can manage notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Admin/dispatcher can manage notification logs" ON public.notification_log;
DROP POLICY IF EXISTS "Admin/dispatcher can manage checklist templates" ON public.checklist_templates;
DROP POLICY IF EXISTS "Admin/dispatcher can manage template items" ON public.checklist_template_items;
DROP POLICY IF EXISTS "Admin/dispatcher can manage job types" ON public.job_types;
DROP POLICY IF EXISTS "Admin/dispatcher can manage tags" ON public.tags;
DROP POLICY IF EXISTS "Admin/dispatcher can manage job tags" ON public.job_tags;
DROP POLICY IF EXISTS "Admin/dispatcher can manage line items" ON public.job_line_items;
DROP POLICY IF EXISTS "Admin/dispatcher can manage custom field definitions" ON public.custom_field_definitions;
DROP POLICY IF EXISTS "Admin/dispatcher can manage custom field values" ON public.job_custom_field_values;
DROP POLICY IF EXISTS "Admin/dispatcher can manage job crew" ON public.job_crew;
DROP POLICY IF EXISTS "Admin/dispatcher can manage all activities" ON public.job_activities;
DROP POLICY IF EXISTS "Users can insert activities for jobs they have access to" ON public.job_activities;
DROP POLICY IF EXISTS "Admin/dispatcher can manage conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admin/dispatcher can manage messages" ON public.conversation_messages;
DROP POLICY IF EXISTS "Admin/dispatcher can manage notes" ON public.conversation_notes;
DROP POLICY IF EXISTS "Admin/dispatcher can manage conversation tags" ON public.conversation_tags;
DROP POLICY IF EXISTS "Admin/dispatcher can manage all jobs" ON public.jobs;

-- Drop the policy and function that depend on the old enum type
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Now drop the old is_admin_or_dispatcher function
DROP FUNCTION IF EXISTS public.is_admin_or_dispatcher(uuid);

-- Drop the default value on the role column
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;

-- Update existing dispatcher roles to admin and assistant to technician
UPDATE public.user_roles SET role = 'admin' WHERE role = 'dispatcher';
UPDATE public.user_roles SET role = 'technician' WHERE role = 'assistant';

-- Recreate the app_role enum with new values
ALTER TYPE app_role RENAME TO app_role_old;
CREATE TYPE app_role AS ENUM ('admin', 'manager', 'technician');
ALTER TABLE public.user_roles ALTER COLUMN role TYPE app_role USING role::text::app_role;
DROP TYPE app_role_old;

-- Restore the default value with the new enum
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'technician'::app_role;

-- Recreate the has_role function with the new enum type
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Recreate the admin policy for user_roles
CREATE POLICY "Only admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create the new is_admin_or_manager function
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager')
  )
$$;

-- Update handle_new_user to use new enum
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Assign default role (first user gets admin, rest get technician)
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'technician');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate all RLS policies using is_admin_or_manager

-- checklist_template_items
CREATE POLICY "Admin/manager can manage template items" ON public.checklist_template_items FOR ALL USING (is_admin_or_manager(auth.uid()));

-- checklist_templates
CREATE POLICY "Admin/manager can manage checklist templates" ON public.checklist_templates FOR ALL USING (is_admin_or_manager(auth.uid()));

-- conversation_messages
CREATE POLICY "Admin/manager can manage messages" ON public.conversation_messages FOR ALL USING (is_admin_or_manager(auth.uid()));

-- conversation_notes
CREATE POLICY "Admin/manager can manage notes" ON public.conversation_notes FOR ALL USING (is_admin_or_manager(auth.uid()));

-- conversation_tags
CREATE POLICY "Admin/manager can manage conversation tags" ON public.conversation_tags FOR ALL USING (is_admin_or_manager(auth.uid()));

-- conversations
CREATE POLICY "Admin/manager can manage conversations" ON public.conversations FOR ALL USING (is_admin_or_manager(auth.uid()));

-- custom_field_definitions
CREATE POLICY "Admin/manager can manage custom field definitions" ON public.custom_field_definitions FOR ALL USING (is_admin_or_manager(auth.uid()));

-- customers
CREATE POLICY "Admin/manager can manage customers" ON public.customers FOR ALL USING (is_admin_or_manager(auth.uid()));

-- job_activities
CREATE POLICY "Admin/manager can manage all activities" ON public.job_activities FOR ALL USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can insert activities for jobs they have access to" ON public.job_activities FOR INSERT WITH CHECK (
  (auth.uid() = user_id) AND (is_admin_or_manager(auth.uid()) OR (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_activities.job_id AND jobs.assigned_technician_id = auth.uid()
  )))
);

-- job_checklist_items
CREATE POLICY "Admin/manager can manage checklist items" ON public.job_checklist_items FOR ALL USING (is_admin_or_manager(auth.uid()));

-- job_crew
CREATE POLICY "Admin/manager can manage job crew" ON public.job_crew FOR ALL USING (is_admin_or_manager(auth.uid()));

-- job_custom_field_values
CREATE POLICY "Admin/manager can manage custom field values" ON public.job_custom_field_values FOR ALL USING (is_admin_or_manager(auth.uid()));

-- job_line_items
CREATE POLICY "Admin/manager can manage line items" ON public.job_line_items FOR ALL USING (is_admin_or_manager(auth.uid()));

-- job_notes
CREATE POLICY "Admin/manager can manage notes" ON public.job_notes FOR ALL USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Technicians can add notes to their jobs" ON public.job_notes FOR INSERT WITH CHECK (
  (auth.uid() = author_id) AND (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_notes.job_id AND (jobs.assigned_technician_id = auth.uid() OR is_admin_or_manager(auth.uid()))
  ))
);

-- job_photos
CREATE POLICY "Admin/manager can manage all photos" ON public.job_photos FOR ALL USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Technicians can upload photos to their jobs" ON public.job_photos FOR INSERT WITH CHECK (
  (auth.uid() = uploaded_by) AND (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_photos.job_id AND (jobs.assigned_technician_id = auth.uid() OR is_admin_or_manager(auth.uid()))
  ))
);

-- job_required_skills
CREATE POLICY "Admin/manager can manage job required skills" ON public.job_required_skills FOR ALL USING (is_admin_or_manager(auth.uid()));

-- job_signatures
CREATE POLICY "Admin/manager can manage signatures" ON public.job_signatures FOR ALL USING (is_admin_or_manager(auth.uid()));

-- job_tags
CREATE POLICY "Admin/manager can manage job tags" ON public.job_tags FOR ALL USING (is_admin_or_manager(auth.uid()));

-- job_types
CREATE POLICY "Admin/manager can manage job types" ON public.job_types FOR ALL USING (is_admin_or_manager(auth.uid()));

-- jobs
CREATE POLICY "Admin/manager can manage all jobs" ON public.jobs FOR ALL USING (is_admin_or_manager(auth.uid()));

-- notification_log
CREATE POLICY "Admin/manager can manage notification logs" ON public.notification_log FOR ALL USING (is_admin_or_manager(auth.uid()));

-- notification_preferences
CREATE POLICY "Admin/manager can manage notification preferences" ON public.notification_preferences FOR ALL USING (is_admin_or_manager(auth.uid()));

-- skills
CREATE POLICY "Admin/manager can manage skills" ON public.skills FOR ALL USING (is_admin_or_manager(auth.uid()));

-- tags
CREATE POLICY "Admin/manager can manage tags" ON public.tags FOR ALL USING (is_admin_or_manager(auth.uid()));

-- technician_skills
CREATE POLICY "Admin/manager can manage technician skills" ON public.technician_skills FOR ALL USING (is_admin_or_manager(auth.uid()));

-- technician_locations
CREATE POLICY "Admin/manager can view all locations" ON public.technician_locations FOR SELECT USING (is_admin_or_manager(auth.uid()));
