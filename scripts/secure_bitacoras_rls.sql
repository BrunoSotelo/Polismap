-- SECURING BITACORAS (EVENTS) TABLE
-- This script ensures the 'distrito_id' column exists (used by Frontend) and applies strict RLS.

-- 1. Ensure 'distrito_id' column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bitacoras' AND column_name = 'distrito_id') THEN
        ALTER TABLE public.bitacoras ADD COLUMN distrito_id INTEGER;
    END IF;
END $$;

-- 2. Clean up old insecure policies
DROP POLICY IF EXISTS "Users can view all logs" ON public.bitacoras;
DROP POLICY IF EXISTS "Operativo ve bitacoras de su distrito" ON public.bitacoras;

-- 3. Create SECURE Select Policy
-- Users can only see bitacoras that belong to their district (fetched from app_metadata or user_districts)
-- Admin (role='admin') sees all.

-- Helper for Admin check (re-use or inline)
-- We assume is_admin() exists from previous schema, but inline is safer for portable scripts
-- (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'

CREATE POLICY "Operativo ve bitacoras de su distrito"
ON public.bitacoras
FOR SELECT
TO authenticated
USING (
  -- 1. Admin sees all
  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  OR
  -- 2. User sees their district
  (
    distrito_id = (auth.jwt() -> 'app_metadata' ->> 'distrito')::int
  )
  OR
  -- 3. Fallback: User sees own logs (optional, but good for UX if district mismatch occurs)
  (
    user_id = auth.uid()
  )
);

-- 4. Create SECURE Insert Policy
-- Users can only insert bitacoras for their assigned district
DROP POLICY IF EXISTS "Users can insert their own logs" ON public.bitacoras;

CREATE POLICY "Users can insert logs in their district"
ON public.bitacoras
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id)
  AND
  (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    OR
    (distrito_id = (auth.jwt() -> 'app_metadata' ->> 'distrito')::int)
  )
);

-- 5. Update Policies (Keep logic: only creator can update/delete)
-- (Existing policies "Users can update their own logs" are usually fine, checking auth.uid() = user_id)
