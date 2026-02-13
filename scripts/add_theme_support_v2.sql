-- FIX: Target 'profiles' table directly (Perfiles does not exist)

-- 1. Add theme_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_id text DEFAULT 'neutral_authority';

-- 2. Ensure RLS allows updates to this column
-- (Assuming existing policies allow updates, otherwise we might need to add one)
-- Example policy to allow admins to update any profile:

-- CREATE POLICY "Admins can update all profiles" ON public.profiles 
-- FOR UPDATE USING ( 
--   (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) 
-- );

-- For now, just adding the column is the critical step.
