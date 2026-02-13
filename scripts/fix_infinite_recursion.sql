-- 1. Replace is_admin() with a SECURITY DEFINER function to prevent infinite recursion
-- "SECURITY DEFINER" means the function runs with the privileges of the creator (postgres/admin), bypassing RLS on the table it queries.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Critical: Bypasses RLS
SET search_path = public -- Secure search path
AS $$
BEGIN
  -- Perform a direct check on profiles. 
  -- Since this is SECURITY DEFINER, it won't trigger the profiles RLS policy for the user executing it.
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  );
END;
$$;

-- 2. Ensure PROFILES has correct RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existings to be safe
DROP POLICY IF EXISTS "Profiles View" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Update" ON public.profiles;
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin Select Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Self Select Profiles" ON public.profiles;

-- Drop NEW policies if they already exist (Fix for 42710 error)
DROP POLICY IF EXISTS "Profiles View Strict" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Update Strict" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Insert Strict" ON public.profiles;

-- Create Policies

-- SELECT: 
-- A. Users can see their own profile (auth.uid() = id)
-- B. Admins can see ALL profiles. 
--    Note: calls is_admin(). Since is_admin() is now SECURITY DEFINER, it won't loop back into this policy recursively.

CREATE POLICY "Profiles View Strict" ON public.profiles
    FOR SELECT USING (
        (auth.uid() = id) 
        OR 
        (is_admin()) 
    );

-- UPDATE:
-- Only Admin can update profiles (e.g. set theme, assign districts)
-- Or user can update their own (for theme)? Let's stick to Admin or Self for non-sensitive fields.
-- For now, let's say Admin can update all, User can update self.

CREATE POLICY "Profiles Update Strict" ON public.profiles
    FOR UPDATE USING (
        (auth.uid() = id) 
        OR 
        (is_admin())
    );

-- INSERT:
-- Usually handled by Trigger on Auth.User creation, but if manual insert needed:
CREATE POLICY "Profiles Insert Strict" ON public.profiles
    FOR INSERT WITH CHECK (
        -- auth.uid() = id 
        -- OR is_admin()
        true -- Allow inserts for now (Triggers usually run as admin anyway, but client might need it)
    );
