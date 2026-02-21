'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, MessageSquare, UserPlus } from 'lucide-react';

export default function SignupPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        job_title: jobTitle,
                    },
                },
            });

            if (signUpError) {
                setError(signUpError.message);
                return;
            }

            if (data.user) {
                // Create profile entry
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: data.user.id,
                        email: email,
                        full_name: fullName,
                        job_title: jobTitle,
                        is_approved: false,
                        role: 'member',
                    });

                if (profileError) {
                    console.error('Profile creation error:', profileError);
                }
            }

            setSuccess(true);
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4"
                style={{ background: 'var(--bg-primary)' }}>
                <div className="w-full max-w-md animate-fade-in">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                            style={{ background: 'linear-gradient(135deg, var(--success), #059669)' }}>
                            <UserPlus className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            Request Submitted!
                        </h1>
                    </div>

                    <div className="glass-card-strong p-8 text-center">
                        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                            Your access request has been submitted. An administrator will review
                            and approve your account.
                        </p>
                        <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
                            You&apos;ll be able to sign in once approved.
                        </p>
                        <Link href="/login" className="btn btn-primary">
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'var(--bg-primary)' }}>

            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)' }} />
                <div className="absolute bottom-1/3 left-1/4 w-80 h-80 rounded-full opacity-15"
                    style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)' }} />
            </div>

            <div className="w-full max-w-md animate-fade-in relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                        style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--shadow-glow)' }}>
                        <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        Request Access
                    </h1>
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Admin approval required to join
                    </p>
                </div>

                {/* Signup Form */}
                <div className="glass-card-strong p-8">
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2"
                                style={{ color: 'var(--text-secondary)' }}>
                                Full Name <span style={{ color: 'var(--danger)' }}>*</span>
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="input"
                                placeholder="John Smith"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2"
                                style={{ color: 'var(--text-secondary)' }}>
                                Work Email <span style={{ color: 'var(--danger)' }}>*</span>
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                placeholder="john@company.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2"
                                style={{ color: 'var(--text-secondary)' }}>
                                Job Title <span style={{ color: 'var(--danger)' }}>*</span>
                            </label>
                            <input
                                type="text"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                className="input"
                                placeholder="e.g. Chief Technology Officer"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2"
                                style={{ color: 'var(--text-secondary)' }}>
                                Password <span style={{ color: 'var(--danger)' }}>*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input"
                                    style={{ paddingRight: '44px' }}
                                    placeholder="Min 8 characters"
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                    style={{ color: 'var(--text-tertiary)' }}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm p-3 rounded-lg"
                                style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full btn-lg"
                        >
                            {loading ? (
                                <div className="spinner" style={{ width: '18px', height: '18px', borderTopColor: 'white' }} />
                            ) : (
                                'Submit Request'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                            Already have access?{' '}
                            <Link href="/login"
                                className="font-medium hover:underline"
                                style={{ color: 'var(--accent-primary)' }}>
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="text-center text-xs mt-6" style={{ color: 'var(--text-tertiary)' }}>
                    Real-name policy enforced · All accounts verified
                </p>
            </div>
        </div>
    );
}
