'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SubscriptionTier } from '@/lib/payments/limits';

interface SubscriptionState {
  tier: SubscriptionTier | null;
  status: 'active' | 'inactive' | 'trialing' | 'past_due' | 'cancelled' | null;
  loading: boolean;
  isActive: boolean;
  isTrialing: boolean;
  /** true when user has an active or trialing subscription */
  hasSubscription: boolean;
  cancelAtPeriodEnd: boolean;
  trialEnd: number | null;
  currentPeriodEnd: number | null;
}

interface UseSubscriptionReturn extends SubscriptionState {
  createCheckout: (tier: SubscriptionTier) => Promise<void>;
  openBillingPortal: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const [state, setState] = useState<SubscriptionState>({
    tier: null,
    status: null,
    loading: true,
    isActive: false,
    isTrialing: false,
    hasSubscription: false,
    cancelAtPeriodEnd: false,
    trialEnd: null,
    currentPeriodEnd: null,
  });

  const fetchSubscription = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch('/api/stripe/subscription');
      if (!res.ok) throw new Error('Failed to fetch subscription');
      const data = await res.json();
      const active = data.status === 'active' || data.status === 'trialing';
      setState({
        tier: data.tier ?? null,
        status: data.status ?? null,
        loading: false,
        isActive: active,
        isTrialing: data.isTrialing ?? false,
        hasSubscription: active,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        trialEnd: data.trialEnd ?? null,
        currentPeriodEnd: data.currentPeriodEnd ?? null,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const createCheckout = useCallback(async (tier: SubscriptionTier) => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? 'Failed to create checkout session');
    }

    if (data.alreadySubscribed) {
      // Already active — refresh the page state
      await fetchSubscription();
      return;
    }

    if (!data.url) {
      throw new Error('No checkout URL returned');
    }

    window.location.href = data.url;
  }, [fetchSubscription]);

  const openBillingPortal = useCallback(async () => {
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const data = await res.json();

    if (!res.ok || !data.url) {
      throw new Error(data.error ?? 'Failed to open billing portal');
    }

    window.location.href = data.url;
  }, []);

  return {
    ...state,
    createCheckout,
    openBillingPortal,
    refresh: fetchSubscription,
  };
}
