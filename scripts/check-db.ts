import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function checkDatabase() {
    console.log('Checking database connection and schema...');

    // Try to query profiles
    const { data, error } = await supabase.from('profiles').select('id').limit(1);

    if (error) {
        if (error.message.includes('relation "profiles" does not exist')) {
            console.log('❌ ERROR: The "profiles" table does not exist.');
            console.log('Please run the SQL migration in your Supabase SQL Editor:');
            console.log('File: /Volumes/Storage/ChipChat/chipchat-app/supabase/migrations/001_initial_schema.sql');
        } else {
            console.log('❌ DATABASE ERROR:', error.message);
        }
    } else {
        console.log('✅ "profiles" table exists.');
        console.log('The error might be in the handle_new_user() trigger function.');
    }
}

checkDatabase();
