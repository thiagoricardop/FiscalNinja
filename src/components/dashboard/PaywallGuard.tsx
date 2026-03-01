'use client';

import Link from 'next/link';
import { Lock, CreditCard } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';

/**
 * PaywallGuard — wrap any page or section that requires an active subscription.
 * When the user has no active subscription / free trial, the children are
 * replaced with an upgrade prompt instead.
 */
export function PaywallGuard({ children }: { children: React.ReactNode }) {
  const { isActive, loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-5">
          <Lock className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Subscription Required
        </h2>
        <p className="text-gray-500 max-w-sm mb-6">
          This feature is only available to active subscribers. Start a
          14-day free trial to unlock all features.
        </p>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Link href="/dashboard/settings">
            <CreditCard className="h-4 w-4" />
            View Plans
          </Link>
        </Button>
        <p className="text-xs text-gray-400 mt-3">
          14-day free trial · Cancel anytime
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
