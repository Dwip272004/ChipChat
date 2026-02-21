import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load env vars
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function setupAdmin() {
    const email = process.argv[2];
    const password = process.argv[3];
    const fullName = process.argv[4] || 'Admin User';

    if (!email || !password) {
        console.log('Usage: npx tsx scripts/setup-admin.ts <email> <password> "<full name>"');
        process.exit(1);
    }

    console.log(`Creating admin account for ${email}...`);

    // 1. Create the user in Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
    });

    if (authError) {
        if (authError.message.includes('already registered')) {
            console.log('User already exists in Auth. Attempting to promote to admin...');
            // Get the existing user
            const { data: listData } = await supabase.auth.admin.listUsers();
            const existingUser = listData.users.find(u => u.email === email);
            if (!existingUser) {
                console.error('Could not find existing user.');
                return;
            }

            // Update profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    role: 'admin',
                    is_approved: true,
                    is_verified: true,
                    full_name: fullName
                })
                .eq('id', existingUser.id);

            if (profileError) {
                console.error('Error updating profile:', profileError.message);
            } else {
                console.log('Successfully promoted existing user to Admin.');
            }
            return;
        }
        console.error('Error creating user:', authError.message);
        return;
    }

    const userId = authData.user.id;
    console.log(`Auth user created: ${userId}`);

    // 2. Update the profile (Profile is usually created by trigger, but we update to ensure Admin status)
    // Wait a moment for trigger to finish
    await new Promise(r => setTimeout(r, 1000));

    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            role: 'admin',
            is_approved: true,
            is_verified: true,
            full_name: fullName
        })
        .eq('id', userId);

    if (profileError) {
        console.error('Error updating profile:', profileError.message);
        // If update fails, maybe insert it
        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                email,
                full_name: fullName,
                role: 'admin',
                is_approved: true,
                is_verified: true
            });
        if (insertError) console.error('Error inserting profile:', insertError.message);
    } else {
        console.log('Profile updated to Admin status.');
    }

    console.log('Admin setup complete!');
}

setupAdmin();
