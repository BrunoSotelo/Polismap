-- 1. AFFINITIES (INEs)
ALTER TABLE public.affinities ENABLE ROW LEVEL SECURITY;

-- Drop ALL known/potential policies to ensure a clean slate
DROP POLICY IF EXISTS "Affinities Review" ON public.affinities;
DROP POLICY IF EXISTS "Affinities Insert" ON public.affinities;
DROP POLICY IF EXISTS "Affinities Edit" ON public.affinities;
DROP POLICY IF EXISTS "Affinities Delete" ON public.affinities;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.affinities;
DROP POLICY IF EXISTS "Enable insert for authenticaticated users" ON public.affinities;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.affinities;
DROP POLICY IF EXISTS "Public Read Access" ON public.affinities;
-- Drop LEGACY policies found in audit (CRITICAL FIX)
DROP POLICY IF EXISTS "Enable select for all" ON public.affinities;
DROP POLICY IF EXISTS "Enable insert for all" ON public.affinities;
DROP POLICY IF EXISTS "Admin ve todas las afinidades" ON public.affinities;
DROP POLICY IF EXISTS "Operativo crea afinidades en su distrito" ON public.affinities;
DROP POLICY IF EXISTS "Operativo ve afinidades de su distrito" ON public.affinities;

-- Drop the NEW policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Affinities Select Strict" ON public.affinities;
DROP POLICY IF EXISTS "Affinities Insert Strict" ON public.affinities;
DROP POLICY IF EXISTS "Affinities Update Strict" ON public.affinities;
DROP POLICY IF EXISTS "Affinities Delete Strict" ON public.affinities;

-- Create STRICT Policies

-- SELECT: Only see rows where YOU are the user_id (created by you) OR if you are Admin
CREATE POLICY "Affinities Select Strict" ON public.affinities
    FOR SELECT USING (
        (auth.uid() = user_id) OR (is_admin())
    );

-- INSERT: Authenticated users can insert
CREATE POLICY "Affinities Insert Strict" ON public.affinities
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- UPDATE/DELETE: Only Owner (Admin can also delete if needed, but for now strict owner)
CREATE POLICY "Affinities Update Strict" ON public.affinities
    FOR UPDATE USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Affinities Delete Strict" ON public.affinities
    FOR DELETE USING (auth.uid() = user_id OR is_admin());


-- 2. BITACORAS (Logs)
ALTER TABLE public.bitacoras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bitacoras Select" ON public.bitacoras;
DROP POLICY IF EXISTS "Bitacoras Insert" ON public.bitacoras;
DROP POLICY IF EXISTS "Bitacoras Update" ON public.bitacoras;
DROP POLICY IF EXISTS "Bitacoras Delete" ON public.bitacoras;
DROP POLICY IF EXISTS "Users can view all logs" ON public.bitacoras; -- FOUND IN AUDIT AS PERMISSIVE
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.bitacoras; -- FOUND IN AUDIT AS PERMISSIVE (CRITICAL)
DROP POLICY IF EXISTS "Users can insert their own logs" ON public.bitacoras;
DROP POLICY IF EXISTS "Users can update their own logs" ON public.bitacoras;
DROP POLICY IF EXISTS "Users can delete their own logs" ON public.bitacoras;

-- Drop NEW policies
DROP POLICY IF EXISTS "Bitacoras Select Strict" ON public.bitacoras;
DROP POLICY IF EXISTS "Bitacoras Insert Strict" ON public.bitacoras;
DROP POLICY IF EXISTS "Bitacoras Update Strict" ON public.bitacoras;
DROP POLICY IF EXISTS "Bitacoras Delete Strict" ON public.bitacoras;

-- SELECT: Strict Ownership OR Admin (NOTE: Removed 'Assigned District' logic for now to prevent leaks, until explicitly requested)
-- If district-wide sharing is needed, uncomment the district check.
CREATE POLICY "Bitacoras Select Strict" ON public.bitacoras
    FOR SELECT USING (
        (auth.uid() = user_id) OR (is_admin())
        -- OR (distrito_id IN (SELECT my_districts())) -- Uncomment for District Sharing
    );

CREATE POLICY "Bitacoras Insert Strict" ON public.bitacoras
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Bitacoras Update Strict" ON public.bitacoras
    FOR UPDATE USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Bitacoras Delete Strict" ON public.bitacoras
    FOR DELETE USING (auth.uid() = user_id OR is_admin());


-- 3. LIDERES (Leaders)
ALTER TABLE public.lideres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lideres Select" ON public.lideres;
DROP POLICY IF EXISTS "Lideres Insert" ON public.lideres;
DROP POLICY IF EXISTS "Lideres Modify" ON public.lideres;
DROP POLICY IF EXISTS "Public Read Lideres" ON public.lideres;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.lideres; -- FOUND IN AUDIT AS PERMISSIVE (CRITICAL)
DROP POLICY IF EXISTS "Auth Insert Lideres" ON public.lideres; -- FOUND IN AUDIT AS PERMISSIVE

-- Drop NEW policies
DROP POLICY IF EXISTS "Lideres Select Strict" ON public.lideres;
DROP POLICY IF EXISTS "Lideres Insert Strict" ON public.lideres;
DROP POLICY IF EXISTS "Lideres Update Strict" ON public.lideres;
DROP POLICY IF EXISTS "Lideres Delete Strict" ON public.lideres;

-- SELECT: Strict Ownership OR Admin
CREATE POLICY "Lideres Select Strict" ON public.lideres
    FOR SELECT USING (
        (auth.uid() = user_id) OR (is_admin())
    );

CREATE POLICY "Lideres Insert Strict" ON public.lideres
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Lideres Update Strict" ON public.lideres
    FOR UPDATE USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Lideres Delete Strict" ON public.lideres
    FOR DELETE USING (auth.uid() = user_id OR is_admin());


-- 4. COLONIAS (Reference Data)
-- Colonias are reference data, but we filter by district.
ALTER TABLE public.colonias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Colonias Visibility" ON public.colonias;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.colonias;
DROP POLICY IF EXISTS "Colonias Select Strict" ON public.colonias;

CREATE POLICY "Colonias Select Strict" ON public.colonias
    FOR SELECT USING (
        is_admin() 
        OR 
        distrito_id IN (SELECT my_districts())
    );

-- 5. SECCIONES ELECTORALES (Map Data) - CRITICAL FIX
ALTER TABLE public.secciones_electorales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Access" ON public.secciones_electorales;
DROP POLICY IF EXISTS "Secciones Visibility" ON public.secciones_electorales;

-- Visible if Admin OR if the section belongs to one of my assigned districts
-- Note: 'distrito' column in secciones_electorales is an INTEGER
CREATE POLICY "Secciones Visibility" ON public.secciones_electorales
    FOR SELECT USING (
        is_admin()
        OR
        distrito IN (SELECT my_districts())
    );

-- 6. RELOAD CACHE
NOTIFY pgrst, 'reload schema';
