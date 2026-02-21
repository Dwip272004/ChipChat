'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '../../layout';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Hash, Plus, X } from 'lucide-react';
import Link from 'next/link';

export default function NewThreadPage() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const supabase = createClient();
    const { user } = useAuth();
    const router = useRouter();

    function addTag() {
        const tag = tagInput.trim().toLowerCase();
        if (tag && !tags.includes(tag) && tags.length < 5) {
            setTags([...tags, tag]);
            setTagInput('');
        }
    }

    function removeTag(tag: string) {
        setTags(tags.filter((t) => t !== tag));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;

        if (!user.is_approved) {
            setError('Your account is pending administrative approval. You cannot create threads yet.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            // Create thread
            const { data: thread, error: threadError } = await supabase
                .from('threads')
                .insert({
                    title,
                    description: description || null,
                    tags,
                    created_by: user.id,
                })
                .select()
                .single();

            if (threadError) throw threadError;

            // Add creator as member
            await supabase.from('thread_members').insert({
                thread_id: thread.id,
                user_id: user.id,
            });

            // Log activity
            await supabase.from('activity_logs').insert({
                user_id: user.id,
                action: 'created_thread',
                entity_type: 'thread',
                entity_id: thread.id,
                metadata: { title },
            });

            router.push(`/threads/${thread.id}`);
        } catch (err: any) {
            setError(err.message || 'Failed to create thread');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <Link
                href="/threads"
                className="inline-flex items-center gap-2 text-sm mb-6 hover:underline"
                style={{ color: 'var(--text-secondary)' }}
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Threads
            </Link>

            <div className="glass-card-strong p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div
                        className="flex items-center justify-center w-10 h-10 rounded-lg"
                        style={{ background: 'var(--bg-active)' }}
                    >
                        <Hash className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            Create Thread
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                            Start a new structured discussion
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Title <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="input"
                            placeholder="e.g. Q1 Product Strategy Discussion"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="input"
                            placeholder="What is this thread about?"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Tags (max 5)
                        </label>
                        <div className="flex gap-2 mb-2 flex-wrap">
                            {tags.map((tag) => (
                                <span key={tag} className="badge badge-primary flex items-center gap-1">
                                    {tag}
                                    <button type="button" onClick={() => removeTag(tag)}>
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addTag();
                                    }
                                }}
                                className="input"
                                placeholder="Add a tag…"
                                style={{ flex: 1 }}
                            />
                            <button
                                type="button"
                                onClick={addTag}
                                className="btn btn-secondary"
                                disabled={tags.length >= 5}
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div
                            className="text-sm p-3 rounded-lg"
                            style={{
                                background: 'rgba(239,68,68,0.1)',
                                color: 'var(--danger)',
                                border: '1px solid rgba(239,68,68,0.2)',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Link href="/threads" className="btn btn-secondary">
                            Cancel
                        </Link>
                        <button type="submit" disabled={loading || !title.trim()} className="btn btn-primary flex-1">
                            {loading ? <div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: 'white' }} /> : 'Create Thread'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
