'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '../layout';
import { getInitials, stringToColor } from '@/lib/utils';
import type { Profile } from '@/types/database';
import {
    User, Mail, Briefcase, MapPin, Star, Award, Edit2,
    Save, X, Camera, Hash, Video, CheckSquare,
} from 'lucide-react';

export default function ProfilePage() {
    const { user, refreshProfile } = useAuth();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        full_name: '',
        bio: '',
        job_title: '',
        interests: [] as string[],
        skills: [] as string[],
    });
    const [interestInput, setInterestInput] = useState('');
    const [skillInput, setSkillInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState({ threads: 0, meetings: 0, tasks: 0 });
    const supabase = createClient();

    useEffect(() => {
        if (user) {
            setForm({
                full_name: user.full_name,
                bio: user.bio || '',
                job_title: user.job_title || '',
                interests: user.interests || [],
                skills: user.skills || [],
            });
            fetchStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    async function fetchStats() {
        if (!user) return;
        const [threads, meetings, tasks] = await Promise.all([
            supabase.from('thread_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
            supabase.from('meeting_participants').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('assigned_to', user.id),
        ]);
        setStats({
            threads: threads.count || 0,
            meetings: meetings.count || 0,
            tasks: tasks.count || 0,
        });
    }

    async function handleSave() {
        if (!user) return;
        setSaving(true);
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: form.full_name,
                bio: form.bio || null,
                job_title: form.job_title || null,
                interests: form.interests,
                skills: form.skills,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        if (!error) {
            await supabase.from('activity_logs').insert({
                user_id: user.id,
                action: 'updated_profile',
                entity_type: 'profile',
                entity_id: user.id,
            });
        }

        await refreshProfile();
        setEditing(false);
        setSaving(false);
    }

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setSaving(true);
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}-${Math.random()}.${fileExt}`;

        try {
            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update Profile
            await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            // 4. Log Activity
            await supabase.from('activity_logs').insert({
                user_id: user.id,
                action: 'updated_avatar',
                entity_type: 'profile',
                entity_id: user.id,
            });

            await refreshProfile();
        } catch (err: any) {
            console.error('Avatar upload error:', err.message);
        } finally {
            setSaving(false);
        }
    }

    function addItem(type: 'interests' | 'skills', value: string) {
        const trimmed = value.trim();
        if (trimmed && !form[type].includes(trimmed)) {
            setForm({ ...form, [type]: [...form[type], trimmed] });
        }
    }

    function removeItem(type: 'interests' | 'skills', value: string) {
        setForm({ ...form, [type]: form[type].filter((v) => v !== value) });
    }

    if (!user) return null;

    return (
        <div className="max-w-3xl mx-auto">
            {/* Profile Card */}
            <div className="glass-card-strong p-8 mb-6 animate-fade-in">
                <div className="flex items-start gap-6">
                    {/* Avatar */}
                    <div className="relative group">
                        <div
                            className={`avatar avatar-xl ${saving ? 'opacity-50' : ''}`}
                            style={{ background: stringToColor(user.full_name) }}
                        >
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.full_name} />
                            ) : (
                                getInitials(user.full_name)
                            )}
                        </div>
                        {editing && (
                            <>
                                <input
                                    type="file"
                                    id="avatar-upload"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    disabled={saving}
                                />
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('avatar-upload')?.click()}
                                    className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/50"
                                    disabled={saving}
                                >
                                    <Camera className="w-6 h-6 text-white" />
                                </button>
                            </>
                        )}
                    </div>
                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            {editing ? (
                                <input
                                    type="text"
                                    value={form.full_name}
                                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                    className="input"
                                    style={{ maxWidth: '300px', fontSize: '20px', fontWeight: 700 }}
                                />
                            ) : (
                                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {user.full_name}
                                </h2>
                            )}
                            {user.is_verified && (
                                <Award className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                            )}
                            <span className="badge badge-primary">{user.role}</span>
                        </div>

                        {editing ? (
                            <input
                                type="text"
                                value={form.job_title}
                                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                                className="input mt-2"
                                style={{ maxWidth: '300px' }}
                                placeholder="Job title"
                            />
                        ) : (
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {user.job_title || 'No job title set'}
                            </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                            <Mail className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                                {user.email}
                            </span>
                        </div>

                        <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                            {user.company}
                        </p>
                    </div>

                    {/* Edit Button */}
                    <div>
                        {editing ? (
                            <div className="flex gap-2">
                                <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">
                                    <X className="w-4 h-4" />
                                </button>
                                <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
                                    {saving ? <div className="spinner" style={{ width: '14px', height: '14px' }} /> : <Save className="w-4 h-4" />}
                                    Save
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setEditing(true)} className="btn btn-secondary btn-sm">
                                <Edit2 className="w-4 h-4" />
                                Edit
                            </button>
                        )}
                    </div>
                </div>

                {/* Bio */}
                <div className="mt-6">
                    <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                        Bio
                    </label>
                    {editing ? (
                        <textarea
                            value={form.bio}
                            onChange={(e) => setForm({ ...form, bio: e.target.value })}
                            className="input"
                            placeholder="Tell us about yourself…"
                            rows={3}
                        />
                    ) : (
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {user.bio || 'No bio set.'}
                        </p>
                    )}
                </div>

                {/* Skills */}
                <div className="mt-5">
                    <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                        Skills
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {form.skills.map((skill) => (
                            <span key={skill} className="badge badge-primary flex items-center gap-1">
                                {skill}
                                {editing && (
                                    <button onClick={() => removeItem('skills', skill)}>
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </span>
                        ))}
                        {editing && (
                            <input
                                type="text"
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addItem('skills', skillInput);
                                        setSkillInput('');
                                    }
                                }}
                                className="input"
                                placeholder="Add skill…"
                                style={{ width: '140px', height: '30px', fontSize: '12px' }}
                            />
                        )}
                        {!editing && form.skills.length === 0 && (
                            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No skills added.</span>
                        )}
                    </div>
                </div>

                {/* Interests */}
                <div className="mt-5">
                    <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                        Interests
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {form.interests.map((interest) => (
                            <span key={interest} className="badge badge-neutral flex items-center gap-1">
                                {interest}
                                {editing && (
                                    <button onClick={() => removeItem('interests', interest)}>
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </span>
                        ))}
                        {editing && (
                            <input
                                type="text"
                                value={interestInput}
                                onChange={(e) => setInterestInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addItem('interests', interestInput);
                                        setInterestInput('');
                                    }
                                }}
                                className="input"
                                placeholder="Add interest…"
                                style={{ width: '140px', height: '30px', fontSize: '12px' }}
                            />
                        )}
                        {!editing && form.interests.length === 0 && (
                            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No interests added.</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
                {[
                    { icon: Hash, label: 'Threads Joined', value: stats.threads, color: 'var(--accent-primary)' },
                    { icon: Video, label: 'Meetings Attended', value: stats.meetings, color: 'var(--success)' },
                    { icon: CheckSquare, label: 'Tasks Assigned', value: stats.tasks, color: 'var(--warning)' },
                ].map((stat) => (
                    <div key={stat.label} className="glass-card p-5 text-center">
                        <stat.icon className="w-6 h-6 mx-auto mb-2" style={{ color: stat.color }} />
                        <p className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                            {stat.value}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {stat.label}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
