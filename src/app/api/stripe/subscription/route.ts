import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser, effectiveOwnerId } from '@/lib/auth/rbac';
import { stripe, PRICE_REVERSE_MAP } from '@/lib/payments/stripe';

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ownerId = effectiveOwnerId(user);
    const supabase = await createSupabaseServerClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, stripe_customer_id')
      .eq('id', ownerId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // No Stripe customer yet — user hasn't gone through checkout
    if (!profile.stripe_customer_id) {
      return NextResponse.json({
        tier: null,
        status: null,
        isTrialing: false,
        cancelAtPeriodEnd: false,
        trialEnd: null,
        currentPeriodEnd: null,
      });
    }

    // Fetch real-time subscription data from Stripe
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        limit: 1,
        status: 'all',
      });

      const sub = subscriptions.data[0];
      if (sub) {
        const priceId = sub.items.data[0]?.price?.id;
        const tier = (priceId && PRICE_REVERSE_MAP[priceId]) || profile.subscription_tier || 'solo';
        const currentPeriodEnd = sub.items.data[0]?.current_period_end;

        // Map Stripe status to our simplified status
        let effectiveStatus: 'active' | 'trialing' | 'past_due' | 'cancelled';
        if (sub.status === 'trialing') {
          effectiveStatus = 'trialing';
        } else if (sub.status === 'active') {
          effectiveStatus = 'active';
        } else if (sub.status === 'past_due') {
          effectiveStatus = 'past_due';
        } else {
          effectiveStatus = 'cancelled';
        }

        return NextResponse.json({
          tier,
          status: effectiveStatus,
          isTrialing: sub.status === 'trialing',
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          trialEnd: sub.trial_end ? sub.trial_end * 1000 : null, // convert to ms
          currentPeriodEnd: currentPeriodEnd ? currentPeriodEnd * 1000 : null,
        });
      }
    } catch (stripeErr) {
      console.error('[stripe/subscription] Stripe API error:', stripeErr);
      // Fall back to DB data if Stripe API fails
    }

    // Fallback: use DB data
    return NextResponse.json({
      tier: profile.subscription_tier,
      status: profile.subscription_status,
      isTrialing: false,
      cancelAtPeriodEnd: false,
      trialEnd: null,
      currentPeriodEnd: null,
    });
  } catch (err) {
    console.error('[stripe/subscription]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
