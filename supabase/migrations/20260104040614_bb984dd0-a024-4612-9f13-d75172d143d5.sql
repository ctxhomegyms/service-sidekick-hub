-- Drop the restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admin/dispatcher can manage all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Technicians can update assigned jobs" ON public.jobs;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Authenticated users can view jobs" 
ON public.jobs 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admin/dispatcher can manage all jobs" 
ON public.jobs 
FOR ALL 
TO authenticated
USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Technicians can update assigned jobs" 
ON public.jobs 
FOR UPDATE 
TO authenticated
USING (assigned_technician_id = auth.uid())
WITH CHECK (assigned_technician_id = auth.uid());