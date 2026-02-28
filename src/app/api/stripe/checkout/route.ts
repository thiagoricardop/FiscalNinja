import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser, effectiveOwnerId } from '@/lib/auth/rbac';
import { stripe, PRICE_MAP, getOrCreateStripeCustomer } from '@/lib/payments/stripe';
import type { SubscriptionTier } from '@/lib/payments/stripe';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fiscalninja.co';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tier } = body as { tier: SubscriptionTier };

    if (!tier || !PRICE_MAP[tier]) {
      return NextResponse.json({ error: 'Invalid plan tier' }, { status: 400 });
    }

    const ownerId = effectiveOwnerId(user);
    const supabase = await createSupabaseServerClient();

    // Get user email
    const { data: authData } = await supabase.auth.getUser();
    const email = authData.user?.email;
    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Check if already subscribed (must have a stripe_customer_id AND active status)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, stripe_customer_id')
      .eq('id', ownerId)
      .single();

    if (profile?.stripe_customer_id && profile?.subscription_status === 'active') {
      return NextResponse.json({ alreadySubscribed: true });
    }

    // Get or create Stripe customer
    const stripeCustomerId = await getOrCreateStripeCustomer(ownerId, email);

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: PRICE_MAP[tier], quantity: 1 }],
      success_url: `${APP_URL}/dashboard/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/dashboard/settings?checkout=cancelled`,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId: ownerId, tier },
      },
      metadata: { userId: ownerId, tier },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/checkout]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
