-- Inspect policies on PROFILES table
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Inspect is_admin function definition
SELECT pg_get_functiondef('public.is_admin'::regproc);
