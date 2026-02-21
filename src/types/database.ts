// ============================================
// ChipChat — Database Types
// ============================================

export type UserRole = 'admin' | 'manager' | 'member';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type MeetingStatus = 'scheduled' | 'active' | 'ended';

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
    interests: string[];
    job_title: string | null;
    skills: string[];
    company: string;
    is_verified: boolean;
    role: UserRole;
    is_approved: boolean;
    created_at: string;
    updated_at: string;
}

export interface Thread {
    id: string;
    title: string;
    description: string | null;
    tags: string[];
    created_by: string;
    created_at: string;
    updated_at: string;
    // Joined fields
    creator?: Profile;
    member_count?: number;
    last_message?: Message;
}

export interface ThreadMember {
    thread_id: string;
    user_id: string;
    joined_at: string;
    // Joined
    profile?: Profile;
}

export interface Message {
    id: string;
    thread_id: string;
    user_id: string;
    content: string;
    parent_id: string | null;
    is_pinned: boolean;
    is_edited: boolean;
    edit_history: Array<{ content: string; edited_at: string }>;
    mentions: string[];
    created_at: string;
    updated_at: string;
    // Joined
    user?: Profile;
    files?: MessageFile[];
    reply_count?: number;
    parent?: Message;
}

export interface MessageFile {
    id: string;
    message_id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
    uploaded_at: string;
}

export interface Task {
    id: string;
    thread_id: string;
    title: string;
    description: string | null;
    assigned_to: string | null;
    status: TaskStatus;
    due_date: string | null;
    linked_message_id: string | null;
    linked_meeting_id: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    // Joined
    assignee?: Profile;
    creator?: Profile;
}

export interface Meeting {
    id: string;
    thread_id: string;
    title: string | null;
    status: MeetingStatus;
    started_at: string | null;
    ended_at: string | null;
    livekit_room_name: string | null;
    created_by: string;
    max_participants: number;
    created_at: string;
    // Joined
    creator?: Profile;
    participants?: MeetingParticipant[];
    participant_count?: number;
}

export interface MeetingParticipant {
    meeting_id: string;
    user_id: string;
    joined_at: string;
    left_at: string | null;
    // Joined
    profile?: Profile;
}

export interface MeetingTranscript {
    id: string;
    meeting_id: string;
    content: string;
    speaker_id: string | null;
    timestamp: string;
    created_at: string;
    // Joined
    speaker?: Profile;
}

export interface MeetingMinutes {
    id: string;
    meeting_id: string;
    summary: string | null;
    decisions: Array<{ text: string; decided_by?: string }>;
    action_items: Array<{ text: string; assigned_to?: string; due_date?: string }>;
    attendees: string[];
    version: number;
    edited_by: string | null;
    content: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface ActivityLog {
    id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata: Record<string, unknown>;
    created_at: string;
    // Joined
    user?: Profile;
}
