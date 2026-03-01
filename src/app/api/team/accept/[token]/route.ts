import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/rbac';

interface Params {
  params: { token: string };
}

// ─── GET /api/team/accept/[token] — Get invite info ──
export async function GET(_req: Request, { params }: Params) {
  const { data: invite } = await supabaseAdmin
    .from('team_members')
    .select('id, owner_id, invited_email, role, accepted_at, active')
    .eq('invite_token', params.token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });
  }

  if (!invite.active) {
    return NextResponse.json({ error: 'This invite has been cancelled' }, { status: 410 });
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 410 });
  }

  // Get owner company name
  const { data: owner } = await supabaseAdmin
    .from('profiles')
    .select('company_name, full_name')
    .eq('id', invite.owner_id)
    .single();

  return NextResponse.json({
    email: invite.invited_email,
    role: invite.role,
    company_name: owner?.company_name ?? 'Unknown Company',
    owner_name: owner?.full_name ?? null,
  });
}

// ─── POST /api/team/accept/[token] — Accept invite ───
export async function POST(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to accept an invite' }, { status: 401 });
  }

  // ── Block: owners can never accept invites ──
  if (user.role === 'owner') {
    return NextResponse.json(
      { error: 'You are already registered as an account owner. An owner cannot join another team. Please use a different account.' },
      { status: 403 },
    );
  }

  // ── Block: users already on a team ──
  if (user.parent_user_id) {
    return NextResponse.json(
      { error: 'You are already a member of another team. You must leave your current team before accepting a new invite.' },
      { status: 403 },
    );
  }

  const { data: invite } = await supabaseAdmin
    .from('team_members')
    .select('id, owner_id, invited_email, role, accepted_at, active')
    .eq('invite_token', params.token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });
  }

  if (!invite.active) {
    return NextResponse.json({ error: 'This invite has been cancelled' }, { status: 410 });
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 410 });
  }

  // ── Block: email mismatch ──
  // Fetch the current user's email from auth
  const { data: authData } = await supabaseAdmin.auth.admin.getUserById(user.id);
  const userEmail = authData?.user?.email?.toLowerCase();

  if (userEmail && invite.invited_email && userEmail !== invite.invited_email.toLowerCase()) {
    return NextResponse.json(
      { error: `This invite was sent to ${invite.invited_email}. You are signed in as ${userEmail}. Please sign in with the correct account.` },
      { status: 403 },
    );
  }

  // ── Block: owner trying to join their own team ──
  if (user.id === invite.owner_id) {
    return NextResponse.json(
      { error: 'You cannot accept an invite to your own team.' },
      { status: 403 },
    );
  }

  // Update team_members record
  const { error: memberError } = await supabaseAdmin
    .from('team_members')
    .update({
      user_id: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invite.id);

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  // Update the user's profile with role and parent_user_id
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      role: invite.role as any,
      parent_user_id: invite.owner_id,
    })
    .eq('id', user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    role: invite.role,
    message: `You've joined as ${invite.role}. Redirecting to onboarding…`,
  });
}
