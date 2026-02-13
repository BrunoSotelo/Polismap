
-- 1. Enable RLS on all sensitive tables
ALTER TABLE colonias ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE affinities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lideres ENABLE ROW LEVEL SECURITY;
-- (Ensure other tables like resultados_electorales are enabled if they exist and need protection)

-- 2. Create PROFILES table (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_admin)
  VALUES (new.id, new.email, FALSE);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid duplication errors on re-runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 3. Create USER_DISTRICTS table (Assignments)
CREATE TABLE IF NOT EXISTS public.user_districts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    distrito_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, distrito_id)
);

-- Enable RLS on these new tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_districts ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------
-- 4. RLS POLICIES (The Core Logic)
-- ---------------------------------------------------------

-- HELPER FUNCTIONS FOR CLEANER POLICIES

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Get IDs of districts assigned to current user
CREATE OR REPLACE FUNCTION public.my_districts()
RETURNS SETOF INTEGER AS $$
  SELECT distrito_id FROM public.user_districts
  WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;


-- A. PROFILES & USER_DISTRICTS
-- Users can see their own profile. Admin sees all.
DROP POLICY IF EXISTS "Profiles visible to owner or admin" ON profiles;
CREATE POLICY "Profiles visible to owner or admin" ON profiles
    FOR SELECT USING (auth.uid() = id OR is_admin());

-- Users can see their assignments. Admin sees all.
DROP POLICY IF EXISTS "Assignments visible to owner or admin" ON user_districts;
CREATE POLICY "Assignments visible to owner or admin" ON user_districts
    FOR SELECT USING (user_id = auth.uid() OR is_admin());


-- B. COLONIAS (Visibility)
-- Visible if: User is Admin OR Colony belongs to an assigned District
DROP POLICY IF EXISTS "Colonias Visibility" ON colonias;
CREATE POLICY "Colonias Visibility" ON colonias
    FOR SELECT USING (
        is_admin() 
        OR 
        distrito_id IN (SELECT my_districts())
    );


-- C. BITACORAS (Visibility & Editing)
-- SELECT: Admin OR Assigned District
DROP POLICY IF EXISTS "Bitacoras Select" ON bitacoras;
CREATE POLICY "Bitacoras Select" ON bitacoras
    FOR SELECT USING (
        is_admin() 
        OR 
        distrito_id IN (SELECT my_districts())
    );

-- INSERT: Authenticated users can insert. 
DROP POLICY IF EXISTS "Bitacoras Insert" ON bitacoras;
CREATE POLICY "Bitacoras Insert" ON bitacoras
    FOR INSERT WITH CHECK (auth.role() = 'authenticated'); 

-- UPDATE/DELETE: ONLY OWNER (Specific Request: "lo que él mismo subió")
DROP POLICY IF EXISTS "Bitacoras Update" ON bitacoras;
CREATE POLICY "Bitacoras Update" ON bitacoras
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Bitacoras Delete" ON bitacoras;
CREATE POLICY "Bitacoras Delete" ON bitacoras
    FOR DELETE USING (auth.uid() = user_id);


-- D. AFFINITIES (Visibility & Editing)
-- SELECT: Specific Request: "visualizar solo las afinidades que él mismo subió"
DROP POLICY IF EXISTS "Affinities Review" ON affinities;
CREATE POLICY "Affinities Review" ON affinities
    FOR SELECT USING (
        is_admin() 
        OR 
        auth.uid() = user_id -- Strict Ownership as requested
    );

-- INSERT
DROP POLICY IF EXISTS "Affinities Insert" ON affinities;
CREATE POLICY "Affinities Insert" ON affinities
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- UPDATE/DELETE
DROP POLICY IF EXISTS "Affinities Edit" ON affinities;
CREATE POLICY "Affinities Edit" ON affinities
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Affinities Delete" ON affinities;
CREATE POLICY "Affinities Delete" ON affinities
    FOR DELETE USING (auth.uid() = user_id);

-- E. LIDERES (Optional - Assuming similar logic)
-- SELECT: By District
DROP POLICY IF EXISTS "Lideres Select" ON lideres;
CREATE POLICY "Lideres Select" ON lideres
    FOR SELECT USING (
        is_admin() 
        OR 
        distrito_id IN (SELECT my_districts())
    );

DROP POLICY IF EXISTS "Lideres Insert" ON lideres;
CREATE POLICY "Lideres Insert" ON lideres
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Lideres Modify" ON lideres;
CREATE POLICY "Lideres Modify" ON lideres
    FOR ALL USING (auth.uid() = user_id);

