-- ============================================
-- Fix: Robust RLS and Admin Overrides (Updated)
-- ============================================

-- 1. Create helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update is_approved to include admin override
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT (is_approved = true OR role = 'admin') FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. PROFILES: Ensure Admins can see all profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
CREATE POLICY "Profiles are viewable by approved users and admins"
  ON profiles FOR SELECT TO authenticated
  USING (public.is_approved() OR public.is_admin() OR id = auth.uid());

-- 4. THREADS: Ensure Admins can see all threads regardless of approval status
DROP POLICY IF EXISTS "Threads are viewable by approved users" ON threads;
DROP POLICY IF EXISTS "Threads are viewable by authenticated users" ON threads;
DROP POLICY IF EXISTS "Threads are viewable by approved users or admins" ON threads;
CREATE POLICY "Threads are viewable by approved users or admins"
  ON threads FOR SELECT TO authenticated
  USING (public.is_approved() OR public.is_admin());

-- 5. MESSAGES: Ensure Admins can see all messages
DROP POLICY IF EXISTS "Messages viewable by authenticated users" ON messages;
DROP POLICY IF EXISTS "Messages viewable by approved users or admins" ON messages;
CREATE POLICY "Messages viewable by approved users or admins"
  ON messages FOR SELECT TO authenticated
  USING (public.is_approved() OR public.is_admin());

-- Note: The Realtime publication errors can be ignored if the tables are already members.
-- We have removed the ALTER PUBLICATION commands to avoid "already member" errors.
