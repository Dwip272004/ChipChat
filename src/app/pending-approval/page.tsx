'use client';

import { createClient } from '@/lib/supabase/client';
import { MessageSquare, Clock, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PendingApprovalPage() {
    const router = useRouter();
    const supabase = createClient();

    async function handleSignOut() {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'var(--bg-primary)' }}>

            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)' }} />
            </div>

            <div className="w-full max-w-md animate-fade-in relative z-10 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
                    style={{ background: 'linear-gradient(135deg, var(--warning), #d97706)', boxShadow: '0 0 30px rgba(245,158,11,0.2)' }}>
                    <Clock className="w-10 h-10 text-white" />
                </div>

                <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    Pending Approval
                </h1>
                <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
                    Your account is awaiting administrator approval.<br />
                    You&apos;ll receive access once confirmed.
                </p>

                <div className="glass-card-strong p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <MessageSquare className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            ChipChat
                        </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        Your profile is being reviewed by an administrator. This typically takes
                        less than 24 hours. Please check back soon.
                    </p>
                </div>

                <button
                    onClick={handleSignOut}
                    className="btn btn-ghost mt-6 mx-auto"
                >
                    <LogOut className="w-4 h-4" />
                    Sign out
                </button>
            </div>
        </div>
    );
}
