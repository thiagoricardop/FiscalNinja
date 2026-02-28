import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser, effectiveOwnerId } from '@/lib/auth/rbac';
import { stripe, PRICE_MAP } from '@/lib/payments/stripe';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fiscalninja.co';

/**
 * Create (or reuse) a billing portal configuration that lets customers
 * switch between our 3 plans, cancel, and update payment info.
 */
let cachedConfigId: string | null = null;

async function getPortalConfigId(): Promise<string> {
  if (cachedConfigId) return cachedConfigId;

  const config = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'Manage your FiscalNinja subscription',
    },
    features: {
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price'],
        proration_behavior: 'create_prorations',
        products: [
          {
            product: (await stripe.prices.retrieve(PRICE_MAP.solo)).product as string,
            prices: [PRICE_MAP.solo],
          },
          {
            product: (await stripe.prices.retrieve(PRICE_MAP.fleet)).product as string,
            prices: [PRICE_MAP.fleet],
          },
          {
            product: (await stripe.prices.retrieve(PRICE_MAP.enterprise)).product as string,
            prices: [PRICE_MAP.enterprise],
          },
        ],
      },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        cancellation_reason: {
          enabled: true,
          options: [
            'too_expensive',
            'missing_features',
            'switched_service',
            'unused',
            'other',
          ],
        },
      },
      payment_method_update: {
        enabled: true,
      },
      invoice_history: {
        enabled: true,
      },
    },
  });

  cachedConfigId = config.id;
  return config.id;
}

export async function POST(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ownerId = effectiveOwnerId(user);
    const supabase = await createSupabaseServerClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', ownerId)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found. Please subscribe to a plan first.' },
        { status: 400 },
      );
    }

    const configId = await getPortalConfigId();

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      configuration: configId,
      return_url: `${APP_URL}/dashboard/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/portal]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
