-- 1. Drop Foreign Key Constraint on user_id to allow dummy IDs
ALTER TABLE public.affinities 
DROP CONSTRAINT IF EXISTS affinities_user_id_fkey;

-- 2. Allow Public/Anon Inserts
-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.affinities;
DROP POLICY IF EXISTS "Enable insert for authenticaticated users" ON public.affinities;
DROP POLICY IF EXISTS "Enable insert for all" ON public.affinities;

-- Create a permissive policy for ALL roles (anon and authenticated)
CREATE POLICY "Enable insert for all" 
ON public.affinities FOR INSERT 
TO public 
WITH CHECK (true);

-- Also allow reading for map visualization
CREATE POLICY "Enable select for all" 
ON public.affinities FOR SELECT 
TO public 
USING (true);

-- Reload schema again
NOTIFY pgrst, 'reload schema';
