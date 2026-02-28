'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SubscriptionTier } from '@/lib/payments/stripe';

interface UsageState {
  /** Receipts used this month */
  used: number;
  /** Tier receipt limit (-1 = unlimited) */
  limit: number;
  /** Current subscription tier */
  tier: SubscriptionTier | null;
  /** Remaining receipts (-1 = unlimited) */
  remaining: number;
  /** Usage percentage (0-100+) */
  percentage: number;
  loading: boolean;
}

interface UseUsageReturn extends UsageState {
  /** Whether the user has hit their tier limit */
  isAtLimit: boolean;
  /** Whether the user is approaching the limit (≥ 80 %) */
  isNearLimit: boolean;
  /** Re-fetch usage from server */
  refresh: () => Promise<void>;
}

export function useUsage(): UseUsageReturn {
  const [state, setState] = useState<UsageState>({
    used: 0,
    limit: -1,
    tier: null,
    remaining: -1,
    percentage: 0,
    loading: true,
  });

  const fetchUsage = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch('/api/stripe/usage');
      if (!res.ok) throw new Error('Failed to fetch usage');
      const data = await res.json();
      setState({
        used: data.used ?? 0,
        limit: data.limit ?? -1,
        tier: data.tier ?? null,
        remaining: data.remaining ?? -1,
        percentage: data.percentage ?? 0,
        loading: false,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const isAtLimit = state.limit !== -1 && state.used >= state.limit;
  const isNearLimit = state.limit !== -1 && state.percentage >= 80 && !isAtLimit;

  return { ...state, isAtLimit, isNearLimit, refresh: fetchUsage };
}
