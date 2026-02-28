import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/rbac';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * DELETE /api/account/delete
 * Permanently deletes the authenticated owner's account and ALL associated data.
 * Requires the user to be an owner (not manager/driver).
 * Cascades via foreign key: auth.users → profiles → trucks, drivers, receipts, etc.
 */
export async function DELETE(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only the account owner can delete the account
    if (user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only account owners can delete an account' },
        { status: 403 }
      );
    }

    // supabaseAdmin.auth.admin.deleteUser deletes the auth.users row.
    // The profiles table has ON DELETE CASCADE, so all profile data
    // (trucks, drivers, receipts, team_members, etc.) is also removed.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (error) {
      console.error('[account/delete] Supabase admin error:', error.message);
      return NextResponse.json(
        { error: 'Failed to delete account. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[account/delete] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
