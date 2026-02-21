import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function diagnose() {
    console.log('--- Checking Threads ---');
    const { data: threads, error: threadsError } = await supabaseAdmin
        .from('threads')
        .select('*');

    if (threadsError) {
        console.error('Error fetching threads:', threadsError);
    } else {
        console.log(`Found ${threads?.length || 0} threads:`, threads);
    }

    console.log('\n--- Checking Profiles ---');
    const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('*');

    if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
    } else {
        console.log(`Found ${profiles?.length || 0} profiles:`, profiles?.map(p => ({ id: p.id, email: p.email, role: p.role, is_approved: p.is_approved })));
    }

    console.log('\n--- Checking Thread Members ---');
    const { data: members, error: membersError } = await supabaseAdmin
        .from('thread_members')
        .select('*, profile:profiles(email)');

    if (membersError) {
        console.error('Error fetching members:', membersError);
    } else {
        console.log(`Found ${members?.length || 0} memberships:`, members);
    }
}

diagnose();
