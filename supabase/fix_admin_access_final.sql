-- ============================================
-- FINAL FIX: Admin Access and RLS Visibility
-- ============================================

-- 1. Redefine 'is_admin' for robustness
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Redefine 'is_approved' to allow Admins automatically
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (is_approved = true OR role = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reset THREADS policies
DROP POLICY IF EXISTS "Threads are viewable by approved users" ON threads;
DROP POLICY IF EXISTS "Threads are viewable by authenticated users" ON threads;
DROP POLICY IF EXISTS "Threads are viewable by approved users or admins" ON threads;
DROP POLICY IF EXISTS "Threads are viewable by everyone" ON threads;

CREATE POLICY "Threads visibility"
  ON threads FOR SELECT TO authenticated
  USING (public.is_approved() OR public.is_admin());

-- 4. Reset MESSAGES policies
DROP POLICY IF EXISTS "Messages viewable by authenticated users" ON messages;
DROP POLICY IF EXISTS "Messages viewable by approved users or admins" ON messages;
DROP POLICY IF EXISTS "Messages visibility" ON messages;

CREATE POLICY "Messages visibility"
  ON messages FOR SELECT TO authenticated
  USING (public.is_approved() OR public.is_admin());

-- 5. Reset PROFILES policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by approved users and admins" ON profiles;

CREATE POLICY "Profiles visibility"
  ON profiles FOR SELECT TO authenticated
  USING (public.is_approved() OR public.is_admin() OR id = auth.uid());

-- 6. Ensure real-time publication doesn't cause errors
-- We skip ALTER PUBLICATION completely as it's already set up.
