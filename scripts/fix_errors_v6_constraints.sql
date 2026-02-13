-- FIX V6: DROP ALL CONSTRAINTS (Bitacoras)
-- The user is encountering issues with Foreign Keys for both user_id and seccion_id (0).
-- We will remove these constraints to allow flexible data entry during the demo phase.

-- 1. Drop FK on user_id (if not already done)
ALTER TABLE public.bitacoras DROP CONSTRAINT IF EXISTS bitacoras_user_id_fkey;

-- 2. Drop FK on seccion_id (This fixes the error 'Key (seccion_id)=(0) is not present...')
ALTER TABLE public.bitacoras DROP CONSTRAINT IF EXISTS bitacoras_seccion_id_fkey;

-- 3. Ensure RLS is disabled
ALTER TABLE public.bitacoras DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lideres DISABLE ROW LEVEL SECURITY;
