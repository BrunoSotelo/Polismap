-- DEBUG AFFINITIES POLICIES
-- Goal: See EXACTLY what is protecting the affinities table.

-- 1. Check if RLS is enabled on affinities
SELECT relname, relrowsecurity, relforcerowsecurity 
FROM pg_class 
WHERE relname = 'affinities';

-- 2. List ALL active policies on affinities
-- If this list contains anything with "permissive" that has a wide "qual", that's the leak.
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'affinities';

-- 3. Check for any TRIGGERS that might be bypassing RLS or doing something weird
SELECT tgname, tgenabled, tgcomm 
FROM pg_trigger 
WHERE tgrelid = 'public.affinities'::regclass;
