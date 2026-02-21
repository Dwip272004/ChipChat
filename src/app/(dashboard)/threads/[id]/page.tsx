'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '../../layout';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatRelativeTime, getInitials, stringToColor, truncate } from '@/lib/utils';
import type { Thread, Message, Task, Meeting, Profile } from '@/types/database';
import {
    ArrowLeft, Hash, MessageCircle, CheckSquare, Video, FileText,
    ClipboardList, Users, Settings, Send, Paperclip, AtSign,
    MoreHorizontal, Pin, Edit2, Reply, Plus, Calendar,
    User as UserIcon, Clock, GripVertical, Play, Square,
    ChevronDown, X, Upload, Menu,
} from 'lucide-react';

// ============================================
// Thread Detail Page
// ============================================

export default function ThreadDetailPage() {
    const params = useParams();
    const threadId = params.id as string;
    const [thread, setThread] = useState<Thread | null>(null);
    const [activeTab, setActiveTab] = useState('chat');
    const [members, setMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMembers, setShowMembers] = useState(false);
    const supabase = createClient();
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        fetchThread();
        fetchMembers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threadId]);

    async function fetchThread() {
        const { data, error } = await supabase
            .from('threads')
            .select('*, creator:profiles!threads_created_by_fkey(*)')
            .eq('id', threadId)
            .single();

        if (error || !data) {
            router.push('/threads');
            return;
        }
        setThread(data as Thread);
        setLoading(false);
    }

    async function fetchMembers() {
        const { data } = await supabase
            .from('thread_members')
            .select('*, profile:profiles(*)')
            .eq('thread_id', threadId);

        if (data) {
            setMembers(data.map((m: any) => m.profile).filter(Boolean));
        }
    }

    async function joinThread() {
        if (!user) return;

        if (!user.is_approved) {
            alert('Your account is pending administrative approval. You cannot join threads yet.');
            return;
        }

        await supabase.from('thread_members').insert({
            thread_id: threadId,
            user_id: user.id,
        });
        fetchMembers();
    }

    const tabs = [
        { id: 'chat', label: 'Chat', icon: MessageCircle },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare },
        { id: 'meetings', label: 'Meetings', icon: Video },
        { id: 'files', label: 'Files', icon: FileText },
        { id: 'minutes', label: 'Minutes', icon: ClipboardList },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="spinner" />
            </div>
        );
    }

    if (!thread) return null;

    const isMember = members.some((m) => m.id === user?.id);

    return (
        <div className="h-full flex flex-col -m-6 -mt-6">
            {/* Thread Header */}
            <div
                className="flex items-center justify-between px-6 py-4 flex-shrink-0 md:h-auto"
                style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    height: 'var(--mobile-header-height, 56px)'
                }}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => {
                            // This is a hack because we don't have access to setIsMobileOpen here easily
                            // But usually on mobile, users just go back to the list
                            window.dispatchEvent(new CustomEvent('open-mobile-sidebar'));
                        }}
                        className="md:hidden btn-icon btn-ghost flex-shrink-0"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <Link
                        href="/threads"
                        className="hidden md:flex btn-icon btn-ghost flex-shrink-0"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div
                        className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
                        style={{ background: 'var(--bg-active)' }}
                    >
                        <Hash className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {thread.title}
                        </h2>
                        {thread.description && (
                            <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                                {thread.description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!isMember && (
                        <button
                            onClick={joinThread}
                            className="btn btn-primary btn-sm"
                            disabled={!user?.is_approved}
                            title={!user?.is_approved ? "Pending administrative approval" : ""}
                        >
                            {user?.is_approved ? 'Join Thread' : 'Pending Approval'}
                        </button>
                    )}
                    <button
                        onClick={() => setShowMembers(!showMembers)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <Users className="w-4 h-4" />
                        {members.length}
                    </button>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex-shrink-0 border-b overflow-x-auto no-scrollbar" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex px-4 md:px-6">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${isActive
                                    ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                                    : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="text-sm font-medium">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-hidden flex">
                <div className="flex-1 overflow-hidden">
                    {activeTab === 'chat' && <ChatTab threadId={threadId} members={members} isMember={isMember} />}
                    {activeTab === 'tasks' && <TasksTab threadId={threadId} members={members} />}
                    {activeTab === 'meetings' && <MeetingsTab threadId={threadId} />}
                    {activeTab === 'files' && <FilesTab threadId={threadId} />}
                    {activeTab === 'minutes' && <MinutesTab threadId={threadId} />}
                </div>
            </div>
        </div>
    );
}

// ============================================
// Chat Tab Component
// ============================================

function ChatTab({
    threadId,
    members,
    isMember,
}: {
    threadId: string;
    members: Profile[];
    isMember: boolean;
}) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();
    const { user } = useAuth();

    useEffect(() => {
        fetchMessages();

        // Subscribe to realtime messages
        const channel = supabase
            .channel(`messages:${threadId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `thread_id=eq.${threadId}`,
                },
                async (payload) => {
                    const { data } = await supabase
                        .from('messages')
                        .select('*, user:profiles(*)')
                        .eq('id', payload.new.id)
                        .single();

                    if (data) {
                        setMessages((prev) => [...prev, data as Message]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threadId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    async function fetchMessages() {
        const { data } = await supabase
            .from('messages')
            .select('*, user:profiles(*), parent:messages(*, user:profiles(*))')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data as Message[]);
        }
        setLoading(false);
    }

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        if (!newMessage.trim() || !user || sending) return;

        setSending(true);
        const content = newMessage.trim();
        const parentId = replyingTo?.id;
        setNewMessage('');
        setReplyingTo(null);

        // Extract @mentions
        const mentionRegex = /@(\w+)/g;
        const mentionedNames = Array.from(content.matchAll(mentionRegex), (m) => m[1]);
        const mentionedIds = members
            .filter((m) =>
                mentionedNames.some(
                    (name) =>
                        m.full_name.toLowerCase().includes(name.toLowerCase())
                )
            )
            .map((m) => m.id);

        const { error } = await supabase.from('messages').insert({
            thread_id: threadId,
            user_id: user.id,
            content,
            mentions: mentionedIds,
            parent_id: parentId || null,
        });

        if (error) {
            console.error('Send error:', error);
            setNewMessage(content);
        }

        // Update thread updated_at
        await supabase
            .from('threads')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', threadId);

        setSending(false);
    }

    async function togglePin(messageId: string, isPinned: boolean) {
        await supabase
            .from('messages')
            .update({ is_pinned: !isPinned })
            .eq('id', messageId);

        setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, is_pinned: !isPinned } : m))
        );
    }

    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)]">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="spinner" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <MessageCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
                            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                                No messages yet. Start the conversation!
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                isOwn={msg.user_id === user?.id}
                                onTogglePin={() => togglePin(msg.id, msg.is_pinned)}
                                onReply={() => setReplyingTo(msg)}
                            />
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Form */}
            {isMember && (
                <form
                    onSubmit={handleSend}
                    className="p-4 border-t pb-safe"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
                >
                    {/* Reply Preview */}
                    {replyingTo && (
                        <div className="flex items-center justify-between p-3 mb-2 rounded-lg animate-slide-in-up"
                            style={{ background: 'var(--bg-tertiary)', borderLeft: '3px solid var(--accent-primary)' }}>
                            <div className="min-w-0">
                                <p className="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>
                                    Replying to {replyingTo.user?.full_name}
                                </p>
                                <p className="text-sm truncate" style={{ color: 'var(--text-tertiary)' }}>
                                    {replyingTo.content}
                                </p>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="btn-icon btn-ghost btn-xs">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <div className="flex items-end gap-2">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="input"
                                placeholder="Type a message… Use @name to mention"
                                style={{ paddingRight: '80px' }}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <button type="button" className="btn-icon btn-ghost" style={{ color: 'var(--text-tertiary)', padding: '4px' }}>
                                    <Paperclip className="w-4 h-4" />
                                </button>
                                <button type="button" className="btn-icon btn-ghost" style={{ color: 'var(--text-tertiary)', padding: '4px' }}>
                                    <AtSign className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || sending}
                            className="btn btn-primary"
                            style={{ height: '42px', width: '42px', padding: 0 }}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

// ============================================
// Message Bubble
// ============================================

function MessageBubble({
    message,
    isOwn,
    onTogglePin,
    onReply,
}: {
    message: Message;
    isOwn: boolean;
    onTogglePin: () => void;
    onReply: () => void;
}) {
    const [showActions, setShowActions] = useState(false);
    const userProfile = message.user;

    return (
        <div className={`relative flex w-full mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`group flex max-w-[85%] md:max-w-[70%] items-end gap-2 px-3 py-1 transition-all cursor-default select-none ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
            >
                {/* Avatar */}
                <div
                    className="avatar avatar-xs mb-1 flex-shrink-0"
                    style={{
                        background: userProfile ? stringToColor(userProfile.full_name) : 'var(--bg-tertiary)',
                        width: '24px',
                        height: '24px',
                        fontSize: '10px'
                    }}
                >
                    {userProfile?.avatar_url ? (
                        <img src={userProfile.avatar_url} alt={userProfile.full_name} />
                    ) : (
                        getInitials(userProfile?.full_name || '?')
                    )}
                </div>

                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    {/* Name & Time (Only for others or first in sequence, but keeping simple for now) */}
                    <div className="flex items-center gap-2 mb-1 px-1">
                        {!isOwn && (
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                                {userProfile?.full_name || 'Unknown'}
                            </span>
                        )}
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {formatRelativeTime(message.created_at)}
                        </span>
                    </div>

                    {/* Bubble */}
                    <div
                        className={`relative rounded-2xl px-4 py-2.5 shadow-sm ${isOwn
                            ? 'bg-[var(--accent-primary)] text-white rounded-tr-none'
                            : 'bg-[var(--bg-tertiary)] rounded-tl-none'
                            }`}
                        style={{
                            border: '1px solid var(--border-subtle)',
                            background: isOwn ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                            color: isOwn ? 'white' : 'var(--text-primary)'
                        }}
                    >
                        {/* Parent Reply Context Inside Bubble */}
                        {message.parent && (
                            <div className={`p-2 mb-2 rounded border-l-2 text-[11px] ${isOwn ? 'bg-[rgba(0,0,0,0.1)]' : 'bg-[rgba(59,130,246,0.05)]'}`}
                                style={{ borderLeftColor: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--accent-primary)' }}>
                                <p className="font-bold mb-0.5" style={{ color: isOwn ? 'white' : 'var(--accent-primary)' }}>
                                    {message.parent.user?.full_name}
                                </p>
                                <p className="truncate opacity-80" style={{ color: isOwn ? 'white' : 'var(--text-secondary)' }}>
                                    {message.parent.content}
                                </p>
                            </div>
                        )}

                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {message.content}
                        </p>

                        {/* Pin Indicator */}
                        {message.is_pinned && (
                            <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                <Pin className="w-2.5 h-2.5 text-blue-500" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions (Visible on hover) */}
                {showActions && (
                    <div className={`flex items-center gap-1 transition-opacity ${isOwn ? 'mr-2' : 'ml-2'}`}>
                        <button
                            onClick={onTogglePin}
                            className="btn-icon w-6 h-6 hover:bg-white/10 rounded-full flex items-center justify-center"
                            style={{ color: 'var(--text-tertiary)' }}
                            title={message.is_pinned ? 'Unpin' : 'Pin'}
                        >
                            <Pin className="w-3 h-3" />
                        </button>
                        <button
                            onClick={onReply}
                            className="btn-icon w-6 h-6 hover:bg-white/10 rounded-full flex items-center justify-center"
                            style={{ color: 'var(--text-tertiary)' }}
                            title="Reply"
                        >
                            <Reply className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// Tasks Tab Component
// ============================================

function TasksTab({ threadId, members }: { threadId: string; members: Profile[] }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newAssignee, setNewAssignee] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    const supabase = createClient();
    const { user } = useAuth();

    useEffect(() => {
        fetchTasks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threadId]);

    async function fetchTasks() {
        const { data } = await supabase
            .from('tasks')
            .select('*, assignee:profiles!tasks_assigned_to_fkey(*), creator:profiles!tasks_created_by_fkey(*)')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: false });

        if (data) setTasks(data as Task[]);
        setLoading(false);
    }

    async function createTask(e: React.FormEvent) {
        e.preventDefault();
        if (!user || !newTitle.trim()) return;

        await supabase.from('tasks').insert({
            thread_id: threadId,
            title: newTitle.trim(),
            description: newDescription || null,
            assigned_to: newAssignee || null,
            due_date: newDueDate || null,
            created_by: user.id,
        });

        setNewTitle('');
        setNewDescription('');
        setNewAssignee('');
        setNewDueDate('');
        setShowForm(false);
        fetchTasks();
    }

    async function updateStatus(taskId: string, status: string) {
        await supabase.from('tasks').update({ status }).eq('id', taskId);
        fetchTasks();
    }

    const statusColumns = [
        { id: 'todo', label: 'To Do', color: 'var(--text-tertiary)' },
        { id: 'in_progress', label: 'In Progress', color: 'var(--warning)' },
        { id: 'done', label: 'Done', color: 'var(--success)' },
    ];

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="p-4 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Tasks ({tasks.length})
                </h3>
                <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">
                    <Plus className="w-3.5 h-3.5" />
                    New Task
                </button>
            </div>

            {/* New Task Form */}
            {showForm && (
                <form onSubmit={createTask} className="glass-card p-4 mb-4 space-y-3 animate-fade-in">
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="input"
                        placeholder="Task title"
                        required
                    />
                    <textarea
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        className="input"
                        placeholder="Description (optional)"
                        rows={2}
                    />
                    <div className="flex gap-2">
                        <select
                            value={newAssignee}
                            onChange={(e) => setNewAssignee(e.target.value)}
                            className="input"
                            style={{ flex: 1 }}
                        >
                            <option value="">Assign to…</option>
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.full_name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="date"
                            value={newDueDate}
                            onChange={(e) => setNewDueDate(e.target.value)}
                            className="input"
                            style={{ flex: 1 }}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary btn-sm">
                            Create
                        </button>
                    </div>
                </form>
            )}

            {/* Kanban Board */}
            <div className="grid grid-cols-3 gap-3">
                {statusColumns.map((col) => {
                    const colTasks = tasks.filter((t) => t.status === col.id);
                    return (
                        <div key={col.id}>
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                                    {col.label}
                                </span>
                                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                    {colTasks.length}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {colTasks.map((task) => (
                                    <div key={task.id} className="glass-card p-3 animate-fade-in">
                                        <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                                            {task.title}
                                        </h4>
                                        {task.description && (
                                            <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                                                {truncate(task.description, 60)}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                {task.assignee && (
                                                    <div
                                                        className="avatar avatar-sm"
                                                        style={{ background: stringToColor(task.assignee.full_name), width: '22px', height: '22px', fontSize: '9px' }}
                                                        title={task.assignee.full_name}
                                                    >
                                                        {getInitials(task.assignee.full_name)}
                                                    </div>
                                                )}
                                                {task.due_date && (
                                                    <span className="text-xs flex items-center gap-0.5" style={{ color: 'var(--text-tertiary)' }}>
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                            <select
                                                value={task.status}
                                                onChange={(e) => updateStatus(task.id, e.target.value)}
                                                className="text-xs rounded px-1.5 py-0.5 cursor-pointer"
                                                style={{
                                                    background: 'var(--bg-tertiary)',
                                                    color: 'var(--text-secondary)',
                                                    border: '1px solid var(--border-subtle)',
                                                }}
                                            >
                                                <option value="todo">Todo</option>
                                                <option value="in_progress">In Progress</option>
                                                <option value="done">Done</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                                {colTasks.length === 0 && (
                                    <div className="text-center py-8 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                        No tasks
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================
// Meetings Tab Component
// ============================================

import {
    LiveKitRoom,
    VideoConference,
} from '@livekit/components-react';
import '@livekit/components-styles';

function MeetingsTab({ threadId }: { threadId: string }) {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeRoom, setActiveRoom] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [newMeetingTitle, setNewMeetingTitle] = useState('');
    const [newMeetingTime, setNewMeetingTime] = useState('');
    const supabase = createClient();
    const { user } = useAuth();

    useEffect(() => {
        fetchMeetings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threadId]);

    async function fetchMeetings() {
        const { data } = await supabase
            .from('meetings')
            .select('*, creator:profiles!meetings_created_by_fkey(*)')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: false });

        if (data) setMeetings(data as Meeting[]);
        setLoading(false);
    }

    async function scheduleMeeting(e: React.FormEvent) {
        e.preventDefault();
        if (!user || !newMeetingTitle.trim()) return;

        await supabase.from('meetings').insert({
            thread_id: threadId,
            title: newMeetingTitle.trim(),
            status: 'scheduled',
            started_at: newMeetingTime || null,
            created_by: user.id,
        });

        setNewMeetingTitle('');
        setNewMeetingTime('');
        setShowScheduleForm(false);
        fetchMeetings();
    }

    async function startMeeting() {
        if (!user) return;

        const roomName = `thread-${threadId}-${Date.now()}`;
        const { data } = await supabase.from('meetings').insert({
            thread_id: threadId,
            title: 'Quick Meeting',
            status: 'active',
            started_at: new Date().toISOString(),
            livekit_room_name: roomName,
            created_by: user.id,
        }).select().single();

        if (data) {
            joinMeeting(roomName);
        }
    }

    async function goLive(meetingId: string) {
        if (!user) return;
        const roomName = `thread-${threadId}-${Date.now()}`;

        await supabase.from('meetings').update({
            status: 'active',
            started_at: new Date().toISOString(),
            livekit_room_name: roomName,
        }).eq('id', meetingId);

        joinMeeting(roomName);
    }

    async function endMeeting(meetingId: string, roomName: string | null) {
        if (!confirm('Are you sure you want to end this meeting for everyone?')) return;

        // 1. Update DB
        await supabase.from('meetings').update({
            status: 'ended',
            ended_at: new Date().toISOString()
        }).eq('id', meetingId);

        // 2. Kill LiveKit room (via API)
        if (roomName) {
            console.log('Requesting server to end room:', roomName);
            try {
                const res = await fetch('/api/livekit/end-room', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ room: roomName })
                });
                const result = await res.json();
                if (!res.ok) {
                    console.error('Server failed to end room:', result.error);
                }
            } catch (e) {
                console.error('Error ending room request:', e);
            }
        } else {
            console.warn('No room name found for meeting:', meetingId);
        }

        if (activeRoom === roomName) {
            setActiveRoom(null);
            setToken(null);
        }

        fetchMeetings();
    }

    async function joinMeeting(roomName: string) {
        if (!user) return;

        try {
            const resp = await fetch(
                `/api/livekit/token?room=${roomName}&username=${encodeURIComponent(user.full_name)}`
            );
            const data = await resp.json();
            if (data.token) {
                setToken(data.token);
                setActiveRoom(roomName);
            }
        } catch (e) {
            console.error('Join meeting error:', e);
        }
    }

    if (activeRoom && token) {
        return (
            <div className="h-full flex flex-col bg-black">
                <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <h3 className="text-white font-medium">Live: {activeRoom}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setActiveRoom(null);
                                setToken(null);
                                fetchMeetings();
                            }}
                            className="btn btn-ghost btn-sm text-white"
                        >
                            Leave Room
                        </button>
                        {(meetings.find(m => m.livekit_room_name === activeRoom)?.created_by === user?.id ||
                            user?.role === 'admin') && (
                                <button
                                    onClick={() => {
                                        const meeting = meetings.find(m => m.livekit_room_name === activeRoom);
                                        if (meeting) endMeeting(meeting.id, activeRoom);
                                    }}
                                    className="btn btn-danger btn-sm"
                                >
                                    End for All
                                </button>
                            )}
                    </div>
                </div>
                <div className="flex-1 min-h-0">
                    <LiveKitRoom
                        video={true}
                        audio={true}
                        token={token}
                        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                        onDisconnected={() => {
                            setActiveRoom(null);
                            setToken(null);
                            fetchMeetings();
                        }}
                        data-lk-theme="default"
                        style={{ height: '100%' }}
                    >
                        <VideoConference />
                    </LiveKitRoom>
                </div>
            </div>
        );
    }

    const liveMeetings = meetings.filter(m => m.status === 'active');
    const scheduledMeetings = meetings.filter(m => m.status === 'scheduled');
    const pastMeetings = meetings.filter(m => m.status === 'ended');

    return (
        <div className="p-4 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Meetings ({meetings.length})
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowScheduleForm(!showScheduleForm)}
                        className="btn btn-secondary btn-sm"
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        Schedule
                    </button>
                    <button onClick={startMeeting} className="btn btn-primary btn-sm">
                        <Video className="w-3.5 h-3.5" />
                        Start Now
                    </button>
                </div>
            </div>

            {/* Schedule Form */}
            {showScheduleForm && (
                <form onSubmit={scheduleMeeting} className="glass-card p-4 mb-6 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                            Schedule New Meeting
                        </h4>
                        <button type="button" onClick={() => setShowScheduleForm(false)} className="text-tertiary">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <input
                        type="text"
                        value={newMeetingTitle}
                        onChange={(e) => setNewMeetingTitle(e.target.value)}
                        className="input"
                        placeholder="Meeting title"
                        required
                    />
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="block text-[10px] uppercase font-bold mb-1 ml-1" style={{ color: 'var(--text-tertiary)' }}>
                                Scheduled Time
                            </label>
                            <input
                                type="datetime-local"
                                value={newMeetingTime}
                                onChange={(e) => setNewMeetingTime(e.target.value)}
                                className="input"
                            />
                        </div>
                    </div>
                    <div className="pt-1">
                        <button type="submit" className="btn btn-primary btn-sm w-full">
                            Confirm Schedule
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="spinner" />
                </div>
            ) : meetings.length === 0 ? (
                <div className="text-center py-20">
                    <Video className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        No meetings found. Start one to begin collaborating live.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Live Section */}
                    {liveMeetings.length > 0 && (
                        <div>
                            <h4 className="text-[10px] uppercase font-bold mb-3 tracking-widest flex items-center gap-2" style={{ color: 'var(--success)' }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                Live Now
                            </h4>
                            <div className="space-y-2">
                                {liveMeetings.map(m => (
                                    <MeetingCard key={m.id} meeting={m} onJoin={() => joinMeeting(m.livekit_room_name!)} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Scheduled Section */}
                    {scheduledMeetings.length > 0 && (
                        <div>
                            <h4 className="text-[10px] uppercase font-bold mb-3 tracking-widest" style={{ color: 'var(--warning)' }}>
                                Up Next
                            </h4>
                            <div className="space-y-2">
                                {scheduledMeetings.map(m => (
                                    <MeetingCard key={m.id} meeting={m} onStart={() => goLive(m.id)} isScheduled />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Past Section */}
                    {pastMeetings.length > 0 && (
                        <div>
                            <h4 className="text-[10px] uppercase font-bold mb-3 tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                                Past Sessions
                            </h4>
                            <div className="space-y-2">
                                {pastMeetings.map(m => (
                                    <MeetingCard key={m.id} meeting={m} isEnded />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function MeetingCard({
    meeting,
    onJoin,
    onStart,
    isScheduled,
    isEnded
}: {
    meeting: Meeting;
    onJoin?: () => void;
    onStart?: () => void;
    isScheduled?: boolean;
    isEnded?: boolean;
}) {
    return (
        <div className="glass-card p-4 animate-fade-in group">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                        style={{
                            background: isEnded ? 'var(--bg-tertiary)' :
                                isScheduled ? 'rgba(245,158,11,0.1)' :
                                    'rgba(16,185,129,0.15)',
                        }}
                    >
                        <Video
                            className="w-5 h-5"
                            style={{
                                color: isEnded ? 'var(--text-tertiary)' :
                                    isScheduled ? 'var(--warning)' :
                                        'var(--success)',
                            }}
                        />
                    </div>
                    <div>
                        <h4 className="text-sm font-medium" style={{ color: isEnded ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                            {meeting.title || 'Meeting'}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            <span>{meeting.creator?.full_name}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {isScheduled && meeting.started_at ?
                                    new Date(meeting.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) :
                                    formatRelativeTime(meeting.created_at)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {onJoin && (
                        <button onClick={onJoin} className="btn btn-primary btn-sm">
                            Join Room
                        </button>
                    )}
                    {onStart && (
                        <button onClick={onStart} className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--border-subtle)' }}>
                            Start Now
                        </button>
                    )}
                    {isEnded && (
                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-tertiary" style={{ color: 'var(--text-tertiary)' }}>
                            Ended
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// Files Tab Component
// ============================================

function FilesTab({ threadId }: { threadId: string }) {
    return (
        <div className="p-4 h-full flex items-center justify-center">
            <div className="text-center">
                <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
                <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    Thread Files
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Files shared in this thread will appear here.
                </p>
                <button className="btn btn-secondary btn-sm mt-4">
                    <Upload className="w-3.5 h-3.5" />
                    Upload File
                </button>
            </div>
        </div>
    );
}

// ============================================
// Minutes Tab Component
// ============================================

function MinutesTab({ threadId }: { threadId: string }) {
    return (
        <div className="p-4 h-full flex items-center justify-center">
            <div className="text-center">
                <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
                <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    Meeting Minutes
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Auto-generated minutes from meetings will appear here.
                </p>
            </div>
        </div>
    );
}
