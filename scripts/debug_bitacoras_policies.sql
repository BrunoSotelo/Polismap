-- DEBUG BITACORAS & LIDERES POLICIES
-- Goal: Find the loose policy on bitacoras (and lideres).

SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    qual
FROM pg_policies
WHERE tablename IN ('bitacoras', 'lideres')
ORDER BY tablename, policyname;
