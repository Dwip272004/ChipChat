import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function testInsert() {
    const dummyId = '00000000-0000-0000-0000-000000000000';
    console.log(`Testing manual insert into profiles for ID: ${dummyId}`);

    const { error } = await supabase
        .from('profiles')
        .insert({
            id: dummyId,
            email: 'test@example.com',
            full_name: 'Test User'
        });

    if (error) {
        console.error('❌ INSERT FAILED:', error.message);
    } else {
        console.log('✅ INSERT SUCCEEDED. Manual insertion works.');
        // Clean up
        await supabase.from('profiles').delete().eq('id', dummyId);
    }
}

testInsert();
