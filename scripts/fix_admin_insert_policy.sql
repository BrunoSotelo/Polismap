
-- Fix: Allow Admins to INSERT/UPDATE/DELETE on user_districts
-- Currently only SELECT is allowed, blocking district assignment.

-- 1. Drop existing insufficient policies on assignments if any overlapping exists (clean slate for management)
DROP POLICY IF EXISTS "Assignments visible to owner or admin" ON user_districts; -- Was SELECT only

-- 2. Create simplified policies

-- A. VIEW: Users see their own, Admins see all.
CREATE POLICY "Assignments View" ON user_districts
    FOR SELECT USING (user_id = auth.uid() OR is_admin());

-- B. MANAGE: Only Admin can Insert/Update/Delete
CREATE POLICY "Assignments Manage" ON user_districts
    FOR ALL USING (is_admin())
    WITH CHECK (is_admin()); 
    -- 'WITH CHECK' ensures they can't insert a record that violates the policy, though is_admin() is static per user.

-- 3. Also Ensure Profiles are editable if needed (Optional but safe)
DROP POLICY IF EXISTS "Profiles visible to owner or admin" ON profiles;

CREATE POLICY "Profiles View" ON profiles
    FOR SELECT USING (auth.uid() = id OR is_admin());

CREATE POLICY "Profiles Manage" ON profiles
    FOR UPDATE USING (is_admin()); -- Only admin can toggle is_admin flag manually if we buil UI for it.
