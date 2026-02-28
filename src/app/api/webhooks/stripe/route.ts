import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, PRICE_REVERSE_MAP } from '@/lib/payments/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── Checkout completed → activate subscription ───────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = (session.metadata?.tier ?? 'solo') as 'solo' | 'fleet' | 'enterprise';
        const customerId = session.customer as string;

        if (!userId) {
          console.warn('[webhook] checkout.session.completed: no userId in metadata');
          break;
        }

        await supabaseAdmin
          .from('profiles')
          .update({
            stripe_customer_id: customerId,
            subscription_tier: tier,
            subscription_status: 'active',
          })
          .eq('id', userId);

        break;
      }

      // ── Subscription changed (plan upgrade/downgrade, trial ended) ────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const priceId = sub.items.data[0]?.price?.id;
        const tier = (priceId && PRICE_REVERSE_MAP[priceId]) || 'solo';

        // Map Stripe status → our status
        let status: 'active' | 'past_due' | 'cancelled';
        if (sub.status === 'active' || sub.status === 'trialing') {
          status = 'active';
        } else if (sub.status === 'past_due') {
          status = 'past_due';
        } else {
          status = 'cancelled';
        }

        await supabaseAdmin
          .from('profiles')
          .update({ subscription_tier: tier, subscription_status: status })
          .eq('stripe_customer_id', customerId);

        break;
      }

      // ── Subscription cancelled ───────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('stripe_customer_id', customerId);

        break;
      }

      // ── Payment failed ───────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId);

        break;
      }

      // ── Payment succeeded (reactivate after past_due) ─────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Only update profiles currently in past_due so we don't
        // accidentally overwrite a fresh checkout flow.
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'active' })
          .eq('stripe_customer_id', customerId)
          .eq('subscription_status', 'past_due');

        break;
      }

      default:
        // Ignore unhandled event types
        break;
    }
  } catch (err) {
    console.error(`[webhook] Error handling event ${event.type}:`, err);
    // Return 400 so Stripe retries the webhook
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
