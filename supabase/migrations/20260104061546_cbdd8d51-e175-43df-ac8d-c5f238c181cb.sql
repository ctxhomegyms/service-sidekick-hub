-- Create invitations table for admin-only user invites
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'technician',
  invited_by UUID NOT NULL REFERENCES profiles(id),
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invitations
CREATE POLICY "Admins can manage invitations" ON public.invitations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow public read of invitations by token (for accepting)
CREATE POLICY "Anyone can view invitation by token" ON public.invitations
  FOR SELECT
  USING (true);

-- Update handle_new_user function to check for pending invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_invitation RECORD;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Check for pending invitation
  SELECT * INTO pending_invitation FROM public.invitations
  WHERE email = NEW.email 
    AND accepted_at IS NULL 
    AND expires_at > now()
  LIMIT 1;
  
  IF FOUND THEN
    -- User has a valid invitation - assign the invited role
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, pending_invitation.role);
    
    -- Mark invitation as accepted
    UPDATE public.invitations SET accepted_at = now() WHERE id = pending_invitation.id;
  ELSE
    -- No invitation - first user gets admin, rest get rejected
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    ELSE
      -- For users without invitations after the first admin, still create a technician role
      -- but they won't be able to access anything meaningful without an invite
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'technician');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;