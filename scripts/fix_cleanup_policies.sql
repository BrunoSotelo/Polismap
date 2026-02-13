
-- CLEANUP SCRIPT: Remove old permissive policies that override strict security.

-- 1. BITACORAS
-- Drop "View All" policy that allowed global access
DROP POLICY IF EXISTS "Users can view all logs" ON public.bitacoras; 
-- (The new policy "Bitacoras Select" from setup_auth.sql will take over)

-- 2. COLONIAS
-- Drop generic authenticated access
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.colonias;
-- (The new policy "Colonias Visibility" will take over)

-- 3. REPORTES_IA
-- Drop generic authenticated access
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.reportes_ia;
-- You might want to add a strict policy for reports too if not done yet, 
-- but at least this stops global access. 
-- Adding a basic strict policy here just in case:
CREATE POLICY "Reportes View" ON public.reportes_ia
    FOR SELECT USING (is_admin() OR distrito_id IN (SELECT my_districts()));


-- 4. LIDERES
-- Drop public read access
DROP POLICY IF EXISTS "Public Read Lideres" ON public.lideres;
-- (The new policy "Lideres Select" will take over)
