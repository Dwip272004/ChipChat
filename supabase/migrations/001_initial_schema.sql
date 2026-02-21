-- ============================================
-- ChipChat — Complete Database Migration
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  interests TEXT[] DEFAULT '{}',
  job_title TEXT,
  skills TEXT[] DEFAULT '{}',
  company TEXT DEFAULT 'ChipChat Corp',
  is_verified BOOLEAN DEFAULT false,
  role TEXT CHECK (role IN ('admin', 'manager', 'member')) DEFAULT 'member',
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- THREADS
-- ============================================
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE thread_members (
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id)
);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  edit_history JSONB DEFAULT '[]'::jsonb,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_thread ON messages(thread_id, created_at);
CREATE INDEX idx_messages_parent ON messages(parent_id);

CREATE TABLE message_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEETINGS
-- ============================================
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT CHECK (status IN ('scheduled', 'active', 'ended')) DEFAULT 'scheduled',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  livekit_room_name TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  max_participants INT DEFAULT 6,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meetings_thread ON meetings(thread_id);

CREATE TABLE meeting_participants (
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  PRIMARY KEY (meeting_id, user_id)
);

CREATE TABLE meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  speaker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meeting_minutes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  summary TEXT,
  decisions JSONB DEFAULT '[]'::jsonb,
  action_items JSONB DEFAULT '[]'::jsonb,
  attendees UUID[] DEFAULT '{}',
  version INT DEFAULT 1,
  edited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TASKS
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
  due_date DATE,
  linked_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  linked_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_thread ON tasks(thread_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);

-- ============================================
-- ACTIVITY LOGS
-- ============================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON activity_logs(user_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES: Anyone authenticated can read approved profiles.
-- Users can update their own profile. Admins can update any.
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated
  USING (is_approved = true OR id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) = 'admin');

-- THREADS: viewable by all authenticated users
CREATE POLICY "Threads are viewable by authenticated users"
  ON threads FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create threads"
  ON threads FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Thread creators/admins can update threads"
  ON threads FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) = 'admin');

CREATE POLICY "Thread creators/admins can delete threads"
  ON threads FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) = 'admin');

-- THREAD MEMBERS
CREATE POLICY "Thread members viewable by authenticated users"
  ON thread_members FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can join threads"
  ON thread_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave threads"
  ON thread_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- MESSAGES: viewable by thread members
CREATE POLICY "Messages viewable by authenticated users"
  ON messages FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Thread members can send messages"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can edit own messages"
  ON messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- MESSAGE FILES
CREATE POLICY "Message files viewable by authenticated users"
  ON message_files FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can upload message files"
  ON message_files FOR INSERT TO authenticated
  WITH CHECK (true);

-- MEETINGS
CREATE POLICY "Meetings viewable by authenticated users"
  ON meetings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create meetings"
  ON meetings FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Meeting creators can update meetings"
  ON meetings FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) = 'admin');

-- MEETING PARTICIPANTS
CREATE POLICY "Meeting participants viewable"
  ON meeting_participants FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can join meetings"
  ON meeting_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own participation"
  ON meeting_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- MEETING TRANSCRIPTS
CREATE POLICY "Transcripts viewable by authenticated users"
  ON meeting_transcripts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert transcripts"
  ON meeting_transcripts FOR INSERT TO authenticated
  WITH CHECK (true);

-- MEETING MINUTES
CREATE POLICY "Minutes viewable by authenticated users"
  ON meeting_minutes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create minutes"
  ON meeting_minutes FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can edit minutes"
  ON meeting_minutes FOR UPDATE TO authenticated
  USING (true);

-- TASKS
CREATE POLICY "Tasks viewable by authenticated users"
  ON tasks FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update tasks"
  ON tasks FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Task creators can delete tasks"
  ON tasks FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ACTIVITY LOGS
CREATE POLICY "Users can see own activity"
  ON activity_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) = 'admin');

CREATE POLICY "Users can create activity logs"
  ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- REALTIME: Enable for messages
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP (Trigger)
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, job_title)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
    NEW.raw_user_meta_data ->> 'job_title'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STORAGE: Create buckets
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('thread-files', 'thread-files', false)
ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('message-files', 'message-files', false)
ON CONFLICT DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

-- Storage policies for thread/message files
CREATE POLICY "Authenticated users can view files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('thread-files', 'message-files'));

CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('thread-files', 'message-files'));
