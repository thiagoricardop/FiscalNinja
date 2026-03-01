import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/rbac';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * DELETE /api/account/delete
 *
 * Role-based account deletion:
 *
 * OWNER  — Deletes auth user → cascades to profile → all owned data
 *          (trucks, drivers, receipts, team_members, etc.)
 *
 * MANAGER / DRIVER — Removes team_members record, resets profile
 *                    (role→owner, parent_user_id→null), then deletes
 *                    the auth user. The owner's data is NOT touched.
 */
export async function DELETE(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role === 'owner') {
      // ─── OWNER: full cascade delete ───
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (error) {
        console.error('[account/delete] Owner delete error:', error.message);
        return NextResponse.json(
          { error: 'Failed to delete account. Please try again.' },
          { status: 500 },
        );
      }
      return NextResponse.json({ success: true });
    }

    // ─── MANAGER / DRIVER: clean removal without touching owner data ───

    // 1. Deactivate & unlink team_members records for this user
    if (user.parent_user_id) {
      await supabaseAdmin
        .from('team_members')
        .update({ active: false, user_id: null })
        .eq('user_id', user.id);
    }

    // 2. Reset profile so cascade doesn't ripple to owner data
    await supabaseAdmin
      .from('profiles')
      .update({ role: 'owner' as any, parent_user_id: null })
      .eq('id', user.id);

    // 3. Delete the auth user (cascades only to this user's own profile row)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (error) {
      console.error('[account/delete] Member delete error:', error.message);
      return NextResponse.json(
        { error: 'Failed to delete account. Please try again.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[account/delete] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
