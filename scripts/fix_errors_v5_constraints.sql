-- FIX V5: REMOVE FOREIGN KEY CONSTRAINTS
-- This allows saving bitacoras even if the user ID is '0000...' or doesn't match auth.users exactly.
-- Run this in Supabase SQL Editor.

-- 1. Drop FK on Bitacoras (allow any user_id)
ALTER TABLE public.bitacoras DROP CONSTRAINT IF EXISTS bitacoras_user_id_fkey;

-- 2. Drop FK on Lideres (just in case they have a seccion_id issue later, though not requested yet, safer for dev)
-- keeping seccion_id for now as that's data integrity, but user_id is often tricky in dev.

-- 3. Ensure RLS is still disabled (just in case V4 wasn't run)
ALTER TABLE public.bitacoras DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lideres DISABLE ROW LEVEL SECURITY;
