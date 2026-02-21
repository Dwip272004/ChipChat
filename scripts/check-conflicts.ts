import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function checkConflicts() {
    const email = 'dwip@chiplabs.tech';
    console.log(`Checking for existing profiles with email: ${email}`);

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email);

    if (error) {
        console.error('Error checking profiles:', error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log('⚠️ CONFLICT FOUND: A profile already exists with this email.');
        console.log(JSON.stringify(data[0], null, 2));
        console.log('\nThis is likely causing the "Database error creating new user" because the trigger attempts to insert a duplicate email.');
    } else {
        console.log('No conflicting profiles found.');
    }
}

checkConflicts();
