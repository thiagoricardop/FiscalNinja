import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/rbac';
import { hasPermission } from '@/lib/auth/permissions';
import { sendTeamInviteEmail } from '@/lib/email/resend';
import { TIER_DRIVER_LIMIT } from '@/lib/payments/limits';
import type { SubscriptionTier } from '@/lib/payments/limits';
import crypto from 'crypto';

// ─── GET /api/team — List team members ────────────────
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(user, 'team.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ownerId = user.role === 'owner' ? user.id : user.parent_user_id;
  if (!ownerId) {
    return NextResponse.json({ error: 'No owner context' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('team_members')
    .select('*')
    .eq('owner_id', ownerId)
    .order('invited_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with profile names for accepted members
  const enriched = await Promise.all(
    (data ?? []).map(async (member) => {
      if (member.user_id) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, email')
          .eq('id', member.user_id)
          .single();
        return {
          ...member,
          user_name: profile?.full_name ?? null,
          user_email: profile?.email ?? member.invited_email,
        };
      }
      return {
        ...member,
        user_name: null,
        user_email: member.invited_email,
      };
    }),
  );

  return NextResponse.json(enriched);
}

// ─── POST /api/team — Invite a team member ────────────
export async function POST(req: Request) {
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
  const { email, role, permissions } = body as {
    email: string;
    role: 'manager' | 'driver';
    permissions?: Record<string, boolean>;
  };

  if (!email || !role || !['manager', 'driver'].includes(role)) {
    return NextResponse.json(
      { error: 'email and role (manager|driver) are required' },
      { status: 400 },
    );
  }

  // ─── Enforce driver limit per plan ──────────────────────────────────────
  if (role === 'driver') {
    const { data: ownerProfile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', ownerId)
      .single();

    const ownerTier = (ownerProfile?.subscription_tier as SubscriptionTier) ?? null;
    const driverLimit = ownerTier ? TIER_DRIVER_LIMIT[ownerTier] : 0;

    if (driverLimit > 0) {
      const { count } = await supabaseAdmin
        .from('team_members')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', ownerId)
        .eq('role', 'driver')
        .eq('active', true);

      if ((count ?? 0) >= driverLimit) {
        return NextResponse.json(
          { error: `Your ${ownerTier} plan allows up to ${driverLimit} drivers. Upgrade to add more.` },
          { status: 403 },
        );
      }
    }
  }

  // Check if already invited
  const { data: existing } = await supabaseAdmin
    .from('team_members')
    .select('id, active, accepted_at')
    .eq('owner_id', ownerId)
    .eq('invited_email', email.toLowerCase())
    .maybeSingle();

  if (existing?.active && existing?.accepted_at) {
    return NextResponse.json(
      { error: 'This user is already an active team member' },
      { status: 409 },
    );
  }

  // Generate invite token
  const inviteToken = crypto.randomBytes(32).toString('hex');

  if (existing) {
    // Re-activate or re-send existing invite
    const { error } = await supabaseAdmin
      .from('team_members')
      .update({
        role: role as any,
        active: true,
        invite_token: inviteToken,
        invited_at: new Date().toISOString(),
        accepted_at: null,
        permissions: permissions ?? {},
      })
      .eq('id', existing.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabaseAdmin.from('team_members').insert({
      owner_id: ownerId,
      invited_email: email.toLowerCase(),
      role: role as any,
      invite_token: inviteToken,
      permissions: permissions ?? {},
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite/${inviteToken}`;

  // Fetch owner info for the email
  const { data: ownerProfile } = await supabaseAdmin
    .from('profiles')
    .select('company_name, full_name')
    .eq('id', ownerId)
    .single();

  // Send invite email (best-effort — don't fail the invite if email fails)
  let emailSent = false;
  try {
    await sendTeamInviteEmail({
      to: email.toLowerCase(),
      inviteUrl,
      role,
      companyName: ownerProfile?.company_name ?? 'Your Team',
      ownerName: ownerProfile?.full_name ?? null,
    });
    emailSent = true;
  } catch (emailErr) {
    console.error('[team/invite] Email send failed (invite still created):', emailErr);
  }

  return NextResponse.json({
    ok: true,
    invite_url: inviteUrl,
    email_sent: emailSent,
    message: emailSent
      ? `Invite email sent to ${email}.`
      : `Invite created for ${email}. Email could not be sent — share this link manually: ${inviteUrl}`,
  });
}
