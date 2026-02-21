'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '../layout';
import Link from 'next/link';
import { formatRelativeTime, truncate } from '@/lib/utils';
import type { Thread } from '@/types/database';
import {
    Hash,
    Plus,
    Users,
    MessageCircle,
    Search,
    Filter,
    Clock,
} from 'lucide-react';

export default function ThreadsPage() {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const supabase = createClient();
    const { user } = useAuth();

    useEffect(() => {
        fetchThreads();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function fetchThreads() {
        const { data, error } = await supabase
            .from('threads')
            .select(`
        *,
        creator:profiles!threads_created_by_fkey(*),
        thread_members(count),
        messages(count)
      `)
            .order('updated_at', { ascending: false });

        if (data) {
            setThreads(
                data.map((t: any) => ({
                    ...t,
                    member_count: t.thread_members?.[0]?.count || 0,
                }))
            );
        }
        setLoading(false);
    }

    const filteredThreads = threads.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        Discussion Threads
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        {threads.length} active thread{threads.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <Link href="/threads/new" className="btn btn-primary">
                    <Plus className="w-4 h-4" />
                    New Thread
                </Link>
            </div>

            {/* Search */}
            <div className="relative mb-5">
                <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--text-tertiary)' }}
                />
                <input
                    type="text"
                    placeholder="Search threads…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '36px' }}
                />
            </div>

            {/* Thread List */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="spinner" />
                </div>
            ) : filteredThreads.length === 0 ? (
                <div className="text-center py-20">
                    <div
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                        style={{ background: 'var(--bg-tertiary)' }}
                    >
                        <Hash className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                        {searchQuery ? 'No threads found' : 'No threads yet'}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        {searchQuery
                            ? 'Try a different search query.'
                            : 'Create your first thread to get started.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredThreads.map((thread, index) => (
                        <Link
                            key={thread.id}
                            href={`/threads/${thread.id}`}
                            className="glass-card block p-5 animate-fade-in"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div
                                        className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 mt-0.5"
                                        style={{ background: 'var(--bg-active)' }}
                                    >
                                        <Hash className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                                            {thread.title}
                                        </h3>
                                        {thread.description && (
                                            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                                                {truncate(thread.description, 120)}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-4 mt-3">
                                            {thread.tags?.length > 0 && (
                                                <div className="flex gap-1.5">
                                                    {thread.tags.slice(0, 3).map((tag) => (
                                                        <span key={tag} className="badge badge-neutral">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {thread.tags.length > 3 && (
                                                        <span className="badge badge-neutral">
                                                            +{thread.tags.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className="flex flex-col items-end gap-2 flex-shrink-0"
                                    style={{ color: 'var(--text-tertiary)' }}
                                >
                                    <span className="text-xs flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatRelativeTime(thread.updated_at)}
                                    </span>
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {thread.member_count || 0}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MessageCircle className="w-3 h-3" />
                                            {(thread as any).messages?.[0]?.count || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
