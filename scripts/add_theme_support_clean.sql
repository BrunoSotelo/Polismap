-- Clean script to add Theme Support to the Profiles table
-- Run this in the Supabase SQL Editor

-- 1. Add the theme_id column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS theme_id text DEFAULT 'neutral_authority';

-- 2. Allow Admins to update themes for other users
-- This creates a policy so that admins can change the theme_id of any user.
DO $$
BEGIN
    -- Check if policy already exists to avoid error
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Admins can update all profiles'
    ) THEN
        CREATE POLICY "Admins can update all profiles" ON public.profiles
        FOR UPDATE
        USING (
            -- Allow if the current user is an admin
            (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
        )
        WITH CHECK (
            (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
        );
    END IF;
END $$;
