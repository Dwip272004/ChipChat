'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Initialize Supabase with Service Role Key for admin operations
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

export async function createAdminUser(formData: {
    email: string;
    fullName: string;
    role: string;
    jobTitle: string;
    password?: string;
}) {
    // 1. Create user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email,
        password: formData.password || Math.random().toString(36).slice(-12),
        email_confirm: true,
        user_metadata: {
            full_name: formData.fullName,
            job_title: formData.jobTitle
        }
    });

    if (authError) {
        return { error: authError.message };
    }

    // 2. Update profile (Trigger should have created it, but we ensure values)
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
            full_name: formData.fullName,
            job_title: formData.jobTitle,
            role: formData.role,
            is_approved: true,
            is_verified: true
        })
        .eq('id', authData.user.id);

    if (profileError) {
        return { error: profileError.message };
    }

    revalidatePath('/admin');
    return { success: true };
}

export async function deleteAdminUser(userId: string) {
    // 1. Delete from Auth (this will cascade to profiles due to references, but let's be explicit if needed)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
        return { error: authError.message };
    }

    revalidatePath('/admin');
    return { success: true };
}

export async function deleteThread(threadId: string) {
    const { error } = await supabaseAdmin
        .from('threads')
        .delete()
        .eq('id', threadId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/admin');
    return { success: true };
}
export async function deleteMeeting(meetingId: string) {
    const { error } = await supabaseAdmin
        .from('meetings')
        .delete()
        .eq('id', meetingId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/admin');
    return { success: true };
}
