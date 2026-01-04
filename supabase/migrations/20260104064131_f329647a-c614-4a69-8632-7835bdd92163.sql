-- Add full_name and phone columns to invitations table
ALTER TABLE public.invitations 
ADD COLUMN full_name text,
ADD COLUMN phone text;