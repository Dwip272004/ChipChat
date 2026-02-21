'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    MessageSquare,
    Hash,
    User,
    Shield,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Plus,
    Search,
    Menu,
} from 'lucide-react';
import { getInitials, stringToColor } from '@/lib/utils';

// ============================================
// Auth Context
// ============================================

interface AuthContextType {
    user: Profile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

// ============================================
// Sidebar Component
// ============================================

function Sidebar({
    collapsed,
    setCollapsed,
    user,
    onNavigate,
}: {
    collapsed: boolean;
    setCollapsed: (v: boolean) => void;
    user: Profile | null;
    onNavigate?: () => void;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const navItems = [
        { href: '/threads', icon: Hash, label: 'Threads' },
        { href: '/profile', icon: User, label: 'Profile' },
        ...(user?.role === 'admin'
            ? [{ href: '/admin', icon: Shield, label: 'Admin' }]
            : []),
    ];

    async function handleSignOut() {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="sidebar-header">
                <div
                    className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
                    style={{ background: 'var(--accent-gradient)' }}
                >
                    <MessageSquare className="w-5 h-5 text-white" />
                </div>
                {!collapsed && (
                    <div className="animate-fade-in flex-1 min-w-0">
                        <h2 className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                            ChipChat
                        </h2>
                        <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                            Executive Platform
                        </p>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={`btn-icon btn-ghost ${collapsed ? 'mx-auto' : 'ml-auto'}`}
                    style={{ color: 'var(--text-tertiary)' }}
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>

            {/* New Thread button */}
            {!collapsed && (
                <div className="px-3 pt-3">
                    <Link
                        href="/threads/new"
                        className="btn btn-primary w-full"
                        style={{ fontSize: '13px' }}
                    >
                        <Plus className="w-4 h-4" />
                        New Thread
                    </Link>
                </div>
            )}

            {/* Navigation */}
            <nav className="sidebar-content">
                <div className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => onNavigate?.()}
                                className={`nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`}
                                title={collapsed ? item.label : undefined}
                            >
                                <item.icon className="nav-icon" />
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Footer / User */}
            <div className="sidebar-footer">
                <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                    <div
                        className="avatar avatar-md flex-shrink-0"
                        style={{
                            background: user
                                ? `hsl(${(user.full_name.charCodeAt(0) * 37) % 360}, 65%, 55%)`
                                : 'var(--bg-tertiary)',
                        }}
                    >
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} />
                        ) : (
                            user?.full_name
                                ?.split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()
                        )}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0 animate-fade-in">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                {user?.full_name || 'Loading...'}
                            </p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                                {user?.job_title || user?.role}
                            </p>
                        </div>
                    )}
                    <button
                        onClick={handleSignOut}
                        className={`btn-icon btn-ghost flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`}
                        style={{ color: 'var(--text-tertiary)' }}
                        title="Sign out"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// Top Bar Component
// ============================================

function TopBar({ title }: { title?: string }) {
    return (
        <header className="topbar">
            <div className="flex items-center gap-4">
                {title && (
                    <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {title}
                    </h1>
                )}
            </div>

            <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative hidden md:block">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                        style={{ color: 'var(--text-tertiary)' }}
                    />
                    <input
                        type="text"
                        placeholder="Search…"
                        className="input"
                        style={{
                            paddingLeft: '36px',
                            width: '240px',
                            height: '38px',
                            fontSize: '13px',
                            background: 'var(--bg-tertiary)',
                        }}
                    />
                </div>
            </div>
        </header>
    );
}


// ============================================
// Dashboard Layout
// ============================================

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [collapsed, setCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [user, setUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const pathname = usePathname();

    async function fetchProfile() {
        const {
            data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (profile) {
                setUser(profile as Profile);
            }
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchProfile();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            fetchProfile();
        });

        return () => subscription.unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Close mobile sidebar on navigation
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    // Global listener for sidebar toggle (useful for deep child components)
    useEffect(() => {
        const handleOpenSidebar = () => setIsMobileOpen(true);
        window.addEventListener('open-mobile-sidebar', handleOpenSidebar);
        return () => window.removeEventListener('open-mobile-sidebar', handleOpenSidebar);
    }, []);

    // Determine page title from pathname
    const getTitle = () => {
        if (pathname.startsWith('/threads/new')) return 'New Thread';
        if (pathname.startsWith('/threads/')) return '';
        if (pathname.startsWith('/threads')) return 'Threads';
        if (pathname.startsWith('/profile')) return 'Profile';
        if (pathname.startsWith('/admin')) return 'Admin Dashboard';
        return 'Dashboard';
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="text-center">
                    <div
                        className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
                        style={{ background: 'var(--accent-gradient)' }}
                    >
                        <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div className="spinner mx-auto" />
                </div>
            </div>
        );
    }

    const isThreadDetail = pathname.startsWith('/threads/') && pathname !== '/threads/new';

    return (
        <AuthContext.Provider value={{ user, loading, refreshProfile: fetchProfile }}>
            <div className={`app-shell ${isThreadDetail ? 'is-thread-detail' : ''}`}>
                {/* Mobile Overlay */}
                {isMobileOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-[90] md:hidden animate-fade-in"
                        onClick={() => setIsMobileOpen(false)}
                    />
                )}

                <div className={`flex h-full w-full overflow-hidden`}>
                    {/* Sidebar: Only on desktop or explicitly opened on mobile */}
                    <aside
                        className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}
                        style={{
                            width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
                            zIndex: 100 // Explicitly ensure it's above overlay
                        }}
                    >
                        <Sidebar
                            collapsed={collapsed}
                            setCollapsed={setCollapsed}
                            user={user}
                            onNavigate={() => setIsMobileOpen(false)}
                        />
                    </aside>

                    <div className="main-area">
                        <header
                            className={`topbar ${isThreadDetail ? 'hidden md:flex' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsMobileOpen(true)}
                                    className="md:hidden btn-icon btn-ghost"
                                    style={{ color: 'var(--text-tertiary)' }}
                                >
                                    <Menu className="w-6 h-6" />
                                </button>
                                <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {getTitle()}
                                </h1>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Search */}
                                <div className="relative hidden md:block">
                                    <Search
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                        style={{ color: 'var(--text-tertiary)' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search…"
                                        className="input"
                                        style={{
                                            paddingLeft: '36px',
                                            width: '240px',
                                            height: '38px',
                                            fontSize: '13px',
                                            background: 'var(--bg-tertiary)',
                                        }}
                                    />
                                </div>
                                <div className="avatar avatar-sm md:hidden" style={{ background: user ? stringToColor(user.full_name) : 'var(--bg-tertiary)' }}>
                                    {getInitials(user?.full_name || '?')}
                                </div>
                            </div>
                        </header>
                        <main className="main-content">{children}</main>
                    </div>
                </div>
            </div>
        </AuthContext.Provider >
    );
}
