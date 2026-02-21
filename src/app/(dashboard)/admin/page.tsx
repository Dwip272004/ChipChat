'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '../layout';
import { formatRelativeTime, getInitials, stringToColor } from '@/lib/utils';
import type { Profile } from '@/types/database';
import {
    Shield, Users, Hash, Video, CheckSquare, TrendingUp,
    UserCheck, UserX, Clock, BarChart3, Activity,
    Check, X, Award, Trash2, Plus,
} from 'lucide-react';
import { createAdminUser, deleteAdminUser, deleteThread, deleteMeeting } from './actions';

export default function AdminPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
    const [allUsers, setAllUsers] = useState<Profile[]>([]);
    const [threads, setThreads] = useState<any[]>([]);
    const [meetings, setMeetings] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeThreads: 0,
        totalMeetings: 0,
        totalTasks: 0,
        completedTasks: 0,
        pendingApprovals: 0,
    });
    const [loading, setLoading] = useState(true);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        fullName: '',
        role: 'member',
        jobTitle: '',
        password: '',
    });
    const supabase = createClient();

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function fetchData() {
        const [
            usersRes,
            pendingRes,
            threadsRes,
            meetingsRes,
            tasksRes,
            completedRes,
        ] = await Promise.all([
            supabase.from('profiles').select('*').eq('is_approved', true).order('created_at', { ascending: false }),
            supabase.from('profiles').select('*').eq('is_approved', false).order('created_at', { ascending: false }),
            supabase.from('threads').select('*, creator:profiles!threads_created_by_fkey(*)', { count: 'exact' }).order('created_at', { ascending: false }),
            supabase.from('profiles').select('*').order('created_at', { ascending: false }), // Re-fetch for badges/stats consistency if needed, but let's just stick to counts
            supabase.from('meetings').select('*, creator:profiles!meetings_created_by_fkey(*)', { count: 'exact' }).order('created_at', { ascending: false }),
            supabase.from('tasks').select('*', { count: 'exact', head: true }),
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'done'),
        ]);

        if (threadsRes.error) console.error('Threads Fetch Error:', threadsRes.error);
        if (usersRes.error) console.error('Users Fetch Error:', usersRes.error);

        console.log('Threads Data:', threadsRes.data);
        console.log('Threads Count:', threadsRes.count);

        setAllUsers((usersRes.data || []) as Profile[]);
        setPendingUsers((pendingRes.data || []) as Profile[]);
        setThreads(threadsRes.data || []);
        setMeetings(meetingsRes.data || []);
        setStats({
            totalUsers: usersRes.data?.length || 0,
            activeThreads: threadsRes.count ?? threadsRes.data?.length ?? 0,
            totalMeetings: meetingsRes.count || 0,
            totalTasks: tasksRes.count || 0,
            completedTasks: completedRes.count || 0,
            pendingApprovals: pendingRes.data?.length || 0,
        });
        setLoading(false);
    }

    async function approveUser(userId: string) {
        await supabase.from('profiles').update({ is_approved: true }).eq('id', userId);
        fetchData();
    }

    async function rejectUser(userId: string) {
        await supabase.from('profiles').delete().eq('id', userId);
        // Also delete auth user if using service role
        fetchData();
    }

    async function toggleVerified(userId: string, currentState: boolean) {
        await supabase.from('profiles').update({ is_verified: !currentState }).eq('id', userId);
        fetchData();
    }

    async function changeRole(userId: string, newRole: string) {
        await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        fetchData();
    }

    async function handleAddUser(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        const result = await createAdminUser(newUser);
        setIsSubmitting(false);

        if (result.success) {
            setIsAddUserModalOpen(false);
            setNewUser({ email: '', fullName: '', role: 'member', jobTitle: '', password: '' });
            fetchData();
        } else {
            alert(result.error || 'Failed to create user');
        }
    }

    async function handleDeleteUser(userId: string) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        const result = await deleteAdminUser(userId);
        if (result.success) {
            fetchData();
        } else {
            alert(result.error || 'Failed to delete user');
        }
    }

    async function handleDeleteThread(threadId: string) {
        if (!confirm('Are you sure you want to delete this thread? All messages and data will be permanently removed.')) return;

        const result = await deleteThread(threadId);
        if (result.success) {
            fetchData();
        } else {
            alert(result.error || 'Failed to delete thread');
        }
    }

    async function handleDeleteMeeting(meetingId: string) {
        if (!confirm('Are you sure you want to delete this meeting? This will also remove associated transcripts and minutes.')) return;

        const result = await deleteMeeting(meetingId);
        if (result.success) {
            fetchData();
        } else {
            alert(result.error || 'Failed to delete meeting');
        }
    }

    const taskCompletionRate = stats.totalTasks > 0
        ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
        : 0;

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'approvals', label: `Approvals (${stats.pendingApprovals})`, icon: UserCheck },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'threads', label: 'Threads', icon: Hash },
        { id: 'meetings', label: 'Meetings', icon: Video },
    ];

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Tabs */}
            <div className="tabs mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`tab flex items-center gap-2 ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="animate-fade-in">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Active Users', value: stats.totalUsers, icon: Users, color: 'var(--accent-primary)', bg: 'rgba(59,130,246,0.1)' },
                            { label: 'Threads', value: stats.activeThreads, icon: Hash, color: 'var(--accent-secondary)', bg: 'rgba(99,102,241,0.1)' },
                            { label: 'Meetings', value: stats.totalMeetings, icon: Video, color: 'var(--success)', bg: 'rgba(16,185,129,0.1)' },
                            { label: 'Task Completion', value: `${taskCompletionRate}%`, icon: CheckSquare, color: 'var(--warning)', bg: 'rgba(245,158,11,0.1)' },
                        ].map((stat) => (
                            <div key={stat.label} className="glass-card-strong p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                                        style={{ background: stat.bg }}
                                    >
                                        <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                                    </div>
                                    <TrendingUp className="w-4 h-4" style={{ color: 'var(--success)' }} />
                                </div>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {stat.value}
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Task Completion Bar */}
                    <div className="glass-card-strong p-6 mb-6">
                        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                            Task Completion Rate
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${taskCompletionRate}%`,
                                        background: 'var(--accent-gradient)',
                                    }}
                                />
                            </div>
                            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {stats.completedTasks}/{stats.totalTasks}
                            </span>
                        </div>
                    </div>

                    {/* Recent Users */}
                    <div className="glass-card-strong p-6">
                        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
                            Recent Users
                        </h3>
                        <div className="space-y-3">
                            {allUsers.slice(0, 5).map((u) => (
                                <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg">
                                    <div
                                        className="avatar avatar-sm"
                                        style={{ background: stringToColor(u.full_name) }}
                                    >
                                        {getInitials(u.full_name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                            {u.full_name}
                                        </p>
                                        <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                                            {u.job_title} · {u.role}
                                        </p>
                                    </div>
                                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                        {formatRelativeTime(u.created_at)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Approvals Tab */}
            {activeTab === 'approvals' && (
                <div className="animate-fade-in">
                    {pendingUsers.length === 0 ? (
                        <div className="text-center py-20">
                            <UserCheck className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
                            <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                                No pending approvals
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                                All access requests have been reviewed.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingUsers.map((u) => (
                                <div key={u.id} className="glass-card p-5 flex items-center gap-4">
                                    <div
                                        className="avatar avatar-lg"
                                        style={{ background: stringToColor(u.full_name) }}
                                    >
                                        {getInitials(u.full_name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                            {u.full_name}
                                        </h4>
                                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            {u.email}
                                        </p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                                            {u.job_title} · Requested {formatRelativeTime(u.created_at)}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => approveUser(u.id)}
                                            className="btn btn-primary btn-sm"
                                        >
                                            <Check className="w-4 h-4" />
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => rejectUser(u.id)}
                                            className="btn btn-danger btn-sm"
                                        >
                                            <X className="w-4 h-4" />
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                            User Management
                        </h3>
                        <button
                            onClick={() => setIsAddUserModalOpen(true)}
                            className="btn btn-primary btn-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add User
                        </button>
                    </div>
                    <div className="glass-card-strong overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                    {['User', 'Role', 'Job Title', 'Verified', 'Joined', 'Actions'].map((h) => (
                                        <th
                                            key={h}
                                            className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                                            style={{ color: 'var(--text-tertiary)' }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {allUsers.map((u) => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="avatar avatar-sm"
                                                    style={{ background: stringToColor(u.full_name) }}
                                                >
                                                    {getInitials(u.full_name)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                        {u.full_name}
                                                    </p>
                                                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                                        {u.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={u.role}
                                                onChange={(e) => changeRole(u.id, e.target.value)}
                                                className="text-xs rounded px-2 py-1 cursor-pointer"
                                                style={{
                                                    background: 'var(--bg-tertiary)',
                                                    color: 'var(--text-secondary)',
                                                    border: '1px solid var(--border-subtle)',
                                                }}
                                                disabled={u.id === user?.id}
                                            >
                                                <option value="member">Member</option>
                                                <option value="manager">Manager</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            {u.job_title || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => toggleVerified(u.id, u.is_verified)}
                                                className={`badge ${u.is_verified ? 'badge-success' : 'badge-neutral'} cursor-pointer`}
                                            >
                                                {u.is_verified ? (
                                                    <>
                                                        <Award className="w-3 h-3" />
                                                        Verified
                                                    </>
                                                ) : (
                                                    'Unverified'
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                            {formatRelativeTime(u.created_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="btn-icon btn-ghost text-red-500 hover:bg-red-500/10"
                                                    title="Delete user"
                                                    disabled={u.id === user?.id}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Threads Tab */}
            {activeTab === 'threads' && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Thread Management
                        </h3>
                    </div>
                    <div className="glass-card-strong overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                    {['Thread', 'Creator', 'Created', 'Actions'].map((h) => (
                                        <th
                                            key={h}
                                            className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                                            style={{ color: 'var(--text-tertiary)' }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {threads.map((t) => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                    style={{ background: 'var(--bg-tertiary)' }}
                                                >
                                                    <Hash className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                                        {t.title}
                                                    </p>
                                                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                                                        {t.description || 'No description'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="avatar avatar-xs"
                                                    style={{ background: stringToColor(t.creator?.full_name || 'System') }}
                                                >
                                                    {getInitials(t.creator?.full_name || 'System')}
                                                </div>
                                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                    {t.creator?.full_name || 'System'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                            {formatRelativeTime(t.created_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleDeleteThread(t.id)}
                                                    className="btn-icon btn-ghost text-red-500 hover:bg-red-500/10"
                                                    title="Delete thread"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {threads.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-20 text-center">
                                            <Hash className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                                                No threads found.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Meetings Tab */}
            {activeTab === 'meetings' && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Meeting Management
                        </h3>
                    </div>
                    <div className="glass-card-strong overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                    {['Meeting', 'Creator', 'Status', 'Date', 'Actions'].map((h) => (
                                        <th
                                            key={h}
                                            className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                                            style={{ color: 'var(--text-tertiary)' }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {meetings.map((m) => (
                                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                    style={{ background: 'var(--bg-tertiary)' }}
                                                >
                                                    <Video className="w-4 h-4" style={{ color: m.status === 'active' ? 'var(--success)' : 'var(--accent-secondary)' }} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                                        {m.title || 'Untitled Meeting'}
                                                    </p>
                                                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                                                        {m.livekit_room_name || 'No Room ID'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="avatar avatar-xs"
                                                    style={{ background: stringToColor(m.creator?.full_name || 'System') }}
                                                >
                                                    {getInitials(m.creator?.full_name || 'System')}
                                                </div>
                                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                    {m.creator?.full_name || 'System'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`badge ${m.status === 'active' ? 'badge-success' :
                                                    m.status === 'scheduled' ? 'badge-warning' : 'badge-neutral'
                                                }`}>
                                                {m.status === 'active' ? '● Live' : m.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                            {formatRelativeTime(m.created_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleDeleteMeeting(m.id)}
                                                    className="btn-icon btn-ghost text-red-500 hover:bg-red-500/10"
                                                    title="Delete meeting"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {meetings.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-20 text-center">
                                            <Video className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                                                No meetings found.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {isAddUserModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                Add New User
                            </h3>
                            <button onClick={() => setIsAddUserModalOpen(false)} className="btn-icon btn-ghost">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddUser}>
                            <div className="modal-body space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>
                                        FULL NAME
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="input"
                                        value={newUser.fullName}
                                        onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>
                                        EMAIL ADDRESS
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        className="input"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>
                                        PASSWORD
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        className="input"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        placeholder="Min 6 characters"
                                        minLength={6}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>
                                        JOB TITLE
                                    </label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newUser.jobTitle}
                                        onChange={(e) => setNewUser({ ...newUser, jobTitle: e.target.value })}
                                        placeholder="Product Designer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>
                                        ROLE
                                    </label>
                                    <select
                                        className="input"
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    >
                                        <option value="member">Member</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setIsAddUserModalOpen(false)}
                                    className="btn btn-ghost"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
