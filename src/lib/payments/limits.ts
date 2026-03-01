/**
 * Plan limit constants — safe to import from both client and server code.
 * Keep in sync with the marketing copy in PLANS arrays.
 */

export type SubscriptionTier = 'solo' | 'fleet' | 'enterprise';

export const TIER_PRICE: Record<SubscriptionTier, number> = {
  solo: 29,
  fleet: 79,
  enterprise: 149,
};

/** Monthly receipt upload limits per tier (-1 = unlimited) */
export const TIER_RECEIPT_LIMIT: Record<SubscriptionTier, number> = {
  solo: 200,
  fleet: 1000,
  enterprise: -1,
};

/** Maximum trucks allowed per tier */
export const TIER_TRUCK_LIMIT: Record<SubscriptionTier, number> = {
  solo: 5,
  fleet: 25,
  enterprise: 100,
};

/** Maximum drivers (team members with driver role) allowed per tier */
export const TIER_DRIVER_LIMIT: Record<SubscriptionTier, number> = {
  solo: 5,
  fleet: 25,
  enterprise: 100,
};
