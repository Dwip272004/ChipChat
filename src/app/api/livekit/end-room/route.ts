import { RoomServiceClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const { room } = await request.json();

        if (!room) {
            return NextResponse.json({ error: 'Missing "room" parameter' }, { status: 400 });
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

        if (!apiKey || !apiSecret || !wsUrl) {
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
        }

        // Verify authorization: Only the meeting creator or an admin can end the room
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: meeting } = await supabase
            .from('meetings')
            .select('*')
            .eq('livekit_room_name', room)
            .single();

        if (!meeting) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (meeting.created_by !== user.id && profile?.role !== 'admin') {
            console.warn(`Unauthorized end room attempt by user ${user.id} for meeting ${room}`);
            return NextResponse.json({ error: 'Forbidden: You cannot end this meeting' }, { status: 403 });
        }

        // Initialize RoomServiceClient
        // LiveKit URL should be the WS URL, ensure it starts with http/https for the SDK client or the SDK will handle it
        const host = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
        console.log(`Terminating room: ${room} on host: ${host}`);

        const svc = new RoomServiceClient(host, apiKey, apiSecret);

        // Delete the room
        try {
            await svc.deleteRoom(room);
            console.log(`Successfully deleted room: ${room}`);
        } catch (sdkError: any) {
            console.error('LiveKit SDK deleteRoom error:', sdkError);
            // Even if LiveKit fails (e.g. room already closed), we might want to return success if we're just syncing DB
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('End room error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
