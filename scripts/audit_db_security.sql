-- =========================================================
-- DEEP SECURITY AUDIT
-- =========================================================

-- 1. Check if RLS is actually ENABLED on tables
-- relrowsecurity = true means ENABLED
SELECT relname AS table_name, relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname IN ('affinities', 'bitacoras', 'lideres', 'secciones_electorales', 'colonias');

-- 2. List ALL Active Policies (to catch hidden ones)
SELECT tablename, policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename IN ('affinities', 'bitacoras', 'lideres', 'secciones_electorales', 'colonias')
ORDER BY tablename, policyname;

-- 3. Check Users & Admin Status (Is your Test User secretly an Admin?)
SELECT id AS user_id, email, is_admin 
FROM public.profiles;

-- 4. Check Data Ownership Sample (Affinities)
-- Are the rows actually pointing to different user_ids?
SELECT left(user_id::text, 8) as owner_id_prefix, count(*) as record_count 
FROM public.affinities 
GROUP BY user_id;
