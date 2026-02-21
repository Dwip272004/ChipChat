-- ============================================
-- Fix: Enforce User Approval for all actions
-- ============================================

-- Function to check if the current user is approved
CREATE OR REPLACE FUNCTION is_approved()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_approved FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. THREADS
DROP POLICY IF EXISTS "Threads are viewable by authenticated users" ON threads;
CREATE POLICY "Threads are viewable by approved users"
  ON threads FOR SELECT TO authenticated
  USING (is_approved());

DROP POLICY IF EXISTS "Authenticated users can create threads" ON threads;
CREATE POLICY "Approved users can create threads"
  ON threads FOR INSERT TO authenticated
  WITH CHECK (is_approved() AND created_by = auth.uid());

-- 2. THREAD MEMBERS
DROP POLICY IF EXISTS "Users can join threads" ON thread_members;
CREATE POLICY "Approved users can join threads"
  ON thread_members FOR INSERT TO authenticated
  WITH CHECK (is_approved() AND user_id = auth.uid());

-- 3. MESSAGES
DROP POLICY IF EXISTS "Thread members can send messages" ON messages;
CREATE POLICY "Approved thread members can send messages"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (is_approved() AND user_id = auth.uid());

-- 4. TASKS
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
CREATE POLICY "Approved users can create tasks"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (is_approved() AND created_by = auth.uid());

-- 5. MEETINGS
DROP POLICY IF EXISTS "Users can create meetings" ON meetings;
CREATE POLICY "Approved users can create meetings"
  ON meetings FOR INSERT TO authenticated
  WITH CHECK (is_approved() AND created_by = auth.uid());

-- 6. STORAGE (Buckets)
-- For thread-files and message-files, only approved users should upload
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
CREATE POLICY "Approved users can upload files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    is_approved() AND 
    bucket_id IN ('thread-files', 'message-files', 'avatars')
  );
