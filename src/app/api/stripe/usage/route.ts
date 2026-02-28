/* =====================================================
 * GET /api/stripe/usage
 *
 * Returns the authenticated user's receipt usage for
 * the current calendar month plus the tier limit.
 * ===================================================== */

import { NextResponse } from 'next/server';
import { getCurrentUser, effectiveOwnerId } from '@/lib/auth/rbac';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { TIER_RECEIPT_LIMIT, type SubscriptionTier } from '@/lib/payments/stripe';

export async function GET() {
  const rbacUser = await getCurrentUser();
  if (!rbacUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ownerId = effectiveOwnerId(rbacUser);

  // Fetch the owner's subscription tier
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', ownerId)
    .single();

  const tier = (profile?.subscription_tier ?? 'solo') as SubscriptionTier;
  const limit = TIER_RECEIPT_LIMIT[tier] ?? 200;

  // Count receipts created in the current calendar month (UTC)
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const { count, error } = await supabaseAdmin
    .from('receipts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', ownerId)
    .gte('created_at', startOfMonth);

  if (error) {
    console.error('[usage] Failed to count receipts:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }

  const used = count ?? 0;

  return NextResponse.json({
    used,
    limit,          // -1 means unlimited
    tier,
    remaining: limit === -1 ? -1 : Math.max(0, limit - used),
    percentage: limit === -1 ? 0 : Math.round((used / limit) * 100),
  });
}
