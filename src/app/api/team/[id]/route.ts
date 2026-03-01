import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/rbac';
import { hasPermission } from '@/lib/auth/permissions';

interface Params {
  params: { id: string };
}

// ─── PATCH /api/team/[id] — Update a team member ─────
export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(user, 'team.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ownerId = user.role === 'owner' ? user.id : user.parent_user_id;
  if (!ownerId) {
    return NextResponse.json({ error: 'No owner context' }, { status: 400 });
  }

  const body = await req.json();
  const { role, permissions, active } = body as {
    role?: 'manager' | 'driver';
    permissions?: Record<string, boolean>;
    active?: boolean;
  };

  const update: Record<string, unknown> = {};
  if (role && ['manager', 'driver'].includes(role)) update.role = role;
  if (permissions !== undefined) update.permissions = permissions;
  if (active !== undefined) update.active = active;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('team_members')
    .update(update)
    .eq('id', params.id)
    .eq('owner_id', ownerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If role changed and member has a user_id, update their profile too
  if (role) {
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (member?.user_id) {
      await supabaseAdmin
        .from('profiles')
        .update({ role: role as any })
        .eq('id', member.user_id);
    }
  }

  return NextResponse.json({ ok: true });
}

// ─── DELETE /api/team/[id] — Remove a team member ────
export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(user, 'team.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ownerId = user.role === 'owner' ? user.id : user.parent_user_id;
  if (!ownerId) {
    return NextResponse.json({ error: 'No owner context' }, { status: 400 });
  }

  // Get user_id before deleting
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('user_id')
    .eq('id', params.id)
    .eq('owner_id', ownerId)
    .single();

  // Soft-delete: deactivate instead of hard-delete
  const { error } = await supabaseAdmin
    .from('team_members')
    .update({ active: false })
    .eq('id', params.id)
    .eq('owner_id', ownerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Reset the user's profile role if they had accepted
  if (member?.user_id) {
    await supabaseAdmin
      .from('profiles')
      .update({ role: 'driver' as any, parent_user_id: null })
      .eq('id', member.user_id);
  }

  return NextResponse.json({ ok: true });
}
