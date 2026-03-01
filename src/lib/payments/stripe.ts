import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Re-export shared limit constants so existing server imports keep working
export type { SubscriptionTier } from '@/lib/payments/limits';
export {
  TIER_PRICE,
  TIER_RECEIPT_LIMIT,
  TIER_TRUCK_LIMIT,
  TIER_DRIVER_LIMIT,
} from '@/lib/payments/limits';
import type { SubscriptionTier } from '@/lib/payments/limits';

// ─── Singleton Stripe instance ────────────────────────────────────────────────
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
});

// ─── Price ID maps ────────────────────────────────────────────────────────────

export const PRICE_MAP: Record<SubscriptionTier, string> = {
  solo: process.env.STRIPE_PRICE_SOLO!,
  fleet: process.env.STRIPE_PRICE_FLEET!,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE!,
};

/** Reverse lookup: price_id → tier name (used in webhook handlers) */
export const PRICE_REVERSE_MAP: Record<string, SubscriptionTier> = {
  [process.env.STRIPE_PRICE_SOLO!]: 'solo',
  [process.env.STRIPE_PRICE_FLEET!]: 'fleet',
  [process.env.STRIPE_PRICE_ENTERPRISE!]: 'enterprise',
};

// ─── Customer helper ──────────────────────────────────────────────────────────

/**
 * Returns the existing Stripe customer ID for a user, or creates a new
 * customer and persists the ID back to the profiles table.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  // Check for existing customer ID
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  // Persist to DB
  await supabaseAdmin
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer.id;
}
