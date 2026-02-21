import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const room = request.nextUrl.searchParams.get('room');
    const username = request.nextUrl.searchParams.get('username');

    if (!room) {
        return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
    } else if (!username) {
        return NextResponse.json({ error: 'Missing "username" query parameter' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Verify user is authorized (member of the thread/room or admin)
    const threadIdMatch = room.match(/^thread-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
    if (threadIdMatch) {
        const threadId = threadIdMatch[1];
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('Token API: No session');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin or thread member
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            const { data: membership } = await supabase
                .from('thread_members')
                .select('*')
                .eq('thread_id', threadId)
                .eq('user_id', user.id)
                .single();

            if (!membership) {
                console.error(`Token API: Access denied for user ${user.id} in thread ${threadId}`);
                return NextResponse.json({ error: 'Not a member of this thread' }, { status: 403 });
            }
        }
    }

    const at = new AccessToken(apiKey, apiSecret, {
        identity: username,
    });

    at.addGrant({
        roomJoin: true,
        room: room,
        canPublish: true,
        canSubscribe: true,
    });

    return NextResponse.json({ token: await at.toJwt() });
}
