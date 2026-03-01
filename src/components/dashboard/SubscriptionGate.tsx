'use client';

import Link from 'next/link';
import { CreditCard, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * SubscriptionBanner — shows an inline banner when the user has no active subscription.
 * Does NOT block page content — just a dismissable notice.
 */
export function SubscriptionBanner() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 flex items-center gap-3 flex-wrap">
      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
        <Lock className="h-4 w-4 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800">
          Subscription required to use features
        </p>
        <p className="text-xs text-amber-600">
          Start a 14-day free trial to unlock all actions.
        </p>
      </div>
      <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5 flex-shrink-0">
        <Link href="/dashboard/settings">
          <CreditCard className="h-3.5 w-3.5" />
          View Plans
        </Link>
      </Button>
    </div>
  );
}

/**
 * GatedButton — wraps a Button component and disables it when no subscription.
 * Shows a tooltip-like title explaining why.
 */
export function GatedButton({
  hasSubscription,
  children,
  ...props
}: {
  hasSubscription: boolean;
  children: React.ReactNode;
} & React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      disabled={!hasSubscription || props.disabled}
      title={!hasSubscription ? 'Subscribe to a plan to unlock this feature' : undefined}
    >
      {!hasSubscription && <Lock className="h-3.5 w-3.5 mr-1.5 opacity-60" />}
      {children}
    </Button>
  );
}
