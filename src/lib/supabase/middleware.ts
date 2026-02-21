import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    // Skip during build when env vars are placeholders
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        return NextResponse.next({ request });
    }

    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const isAuthPage =
        request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/signup');

    const isPendingPage = request.nextUrl.pathname.startsWith('/pending-approval');

    // Not logged in → redirect to login (unless already on auth page)
    if (!user && !isAuthPage) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // Logged in → redirect away from auth pages
    if (user && isAuthPage) {
        const url = request.nextUrl.clone();
        url.pathname = '/threads';
        return NextResponse.redirect(url);
    }

    // Check approval status for logged-in users
    if (user && !isAuthPage && !isPendingPage) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_approved, role')
            .eq('id', user.id)
            .single();

        if (profile && !profile.is_approved) {
            const url = request.nextUrl.clone();
            url.pathname = '/pending-approval';
            return NextResponse.redirect(url);
        }

        // Admin-only routes
        if (
            request.nextUrl.pathname.startsWith('/admin') &&
            profile?.role !== 'admin'
        ) {
            const url = request.nextUrl.clone();
            url.pathname = '/threads';
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}
