-- Add user_id column if it doesn't exist
ALTER TABLE public.affinities 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add image_path column if it doesn't exist (just in case)
ALTER TABLE public.affinities 
ADD COLUMN IF NOT EXISTS image_path TEXT;

-- Update RLS policy to allow users to insert their own data
-- First, enable RLS
ALTER TABLE public.affinities ENABLE ROW LEVEL SECURITY;

-- Drop existing insert policy if it exists to avoid conflicts (optional, but safer)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.affinities;

-- Create insert policy
CREATE POLICY "Enable insert for authenticaticated users" 
ON public.affinities FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Reload the schema cache to ensure PostgREST sees the new columns
NOTIFY pgrst, 'reload schema';
