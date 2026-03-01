'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsage } from '@/hooks/useUsage';
import { usePermissions } from '@/hooks/usePermissions';
import type { SubscriptionTier } from '@/lib/payments/limits';
import {
  Loader2,
  Building2,
  CreditCard,
  Shield,
  Check,
  AlertTriangle,
  ExternalLink,
  Crown,
  Trash2,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { Progress } from '@/components/ui/progress';

const PLANS: {
  tier: SubscriptionTier;
  name: string;
  price: number;
  desc: string;
  features: string[];
  popular?: boolean;
}[] = [
  {
    tier: 'solo',
    name: 'Solo',
    price: 29,
    desc: '1–5 trucks',
    features: ['Up to 5 trucks', 'Up to 5 drivers', '200 receipts/month', 'AI data extraction', 'Excel & CSV export', 'Email support'],
  },
  {
    tier: 'fleet',
    name: 'Fleet',
    price: 79,
    desc: '6–25 trucks',
    popular: true,
    features: ['Up to 25 trucks', 'Up to 25 drivers', '1,000 receipts/month', 'Multi-user access', 'Advanced reports & PDF', 'Priority support'],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 149,
    desc: '26–100 trucks',
    features: ['Up to 100 trucks', 'Up to 100 drivers', 'Unlimited receipts', 'Custom integrations', 'Dedicated account manager', 'Phone support & SLA'],
  },
];

export default function SettingsPage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isOwner } = usePermissions();
  const {
    tier,
    status,
    loading: subLoading,
    isActive,
    isTrialing,
    cancelAtPeriodEnd,
    trialEnd,
    currentPeriodEnd,
    createCheckout,
    openBillingPortal,
    refresh: refreshSubscription,
  } = useSubscription();

  const {
    used: receiptsUsed,
    limit: receiptsLimit,
    percentage: usagePercent,
    isAtLimit,
    isNearLimit,
    loading: usageLoading,
    refresh: refreshUsage,
  } = useUsage();

  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<SubscriptionTier | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');

  // Handle checkout return status from URL params
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      setSuccess('Your free trial is now active! Enjoy 14 days of full access.');
      refreshSubscription();
    } else if (checkout === 'cancelled') {
      setError('Checkout was cancelled. No charge was made.');
    }
  }, [searchParams, refreshSubscription]);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setCompanyName(data.company_name || '');
        setEmail(data.email || '');
      }
    } catch { /* ignore */ }
    setProfileLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: companyName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update company name');
      } else {
        setSuccess('Company information updated.');
      }
    } catch {
      setError('Failed to update company name');
    }
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handlePasswordReset = async () => {
    if (!email) return;
    setSaving(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess('Password reset email sent.');
    }
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleUpgrade = async (planTier: SubscriptionTier) => {
    setCheckoutLoading(planTier);
    setError('');
    try {
      await createCheckout(planTier);
      // If we're still here (alreadySubscribed case), reset loading
      setCheckoutLoading(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setCheckoutLoading(null);
    }
  };

  const handleBillingPortal = async () => {
    setPortalLoading(true);
    setError('');
    try {
      await openBillingPortal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
      setPortalLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete account');
      // Sign out and redirect to home
      await supabase.auth.signOut();
      router.push('/?account=deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const statusBadge = () => {
    if (!status) return null;
    const styleMap: Record<string, string> = {
      active: 'border-green-300 text-green-700 bg-green-50',
      trialing: 'border-blue-300 text-blue-700 bg-blue-50',
      past_due: 'border-yellow-300 text-yellow-700 bg-yellow-50',
      cancelled: 'border-red-300 text-red-700 bg-red-50',
    };
    const labelMap: Record<string, string> = {
      active: cancelAtPeriodEnd ? 'Cancels at period end' : 'Active',
      trialing: cancelAtPeriodEnd ? 'Trial — Cancels' : 'Free Trial',
      past_due: 'Past Due',
      cancelled: 'Cancelled',
    };
    return (
      <Badge variant="outline" className={`${styleMap[status] ?? ''} ml-2`}>
        {labelMap[status] ?? status}
      </Badge>
    );
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and company settings.</p>
      </div>

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Company Info */}
      <Card className="border-gray-100">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-blue-600" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveCompany} className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500">Email cannot be changed here. Contact support to update.</p>
            </div>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-gray-100">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-blue-600" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">Change your password by requesting a reset link.</p>
          <Button variant="outline" onClick={handlePasswordReset} disabled={saving}>
            Send Password Reset Email
          </Button>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="border-gray-100">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-blue-600" />
            Subscription
            {!subLoading && statusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Past due warning */}
          {status === 'past_due' && (
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Your last payment failed. Update your payment method to restore full access.
                <Button
                  variant="link"
                  className="text-yellow-800 underline h-auto p-0 ml-1"
                  onClick={handleBillingPortal}
                  disabled={portalLoading}
                >
                  {portalLoading ? 'Opening...' : 'Update payment method →'}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading skeleton */}
          {subLoading ? (
            <div className="space-y-3">
              <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
              <div className="grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          ) : isActive ? (
            /* Active subscription — show current plan + manage button */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border-2 border-blue-600 bg-blue-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-gray-900 capitalize">{tier} Plan</span>
                    {isTrialing ? (
                      <Badge className="bg-blue-600 text-white text-xs">Free Trial</Badge>
                    ) : (
                      <Badge className="bg-green-600 text-white text-xs">Active</Badge>
                    )}
                  </div>
                  {isTrialing && trialEnd ? (
                    <p className="text-sm text-gray-500 mt-1">
                      Free trial {cancelAtPeriodEnd ? 'ends' : 'until'} {formatDate(trialEnd)}
                      {!cancelAtPeriodEnd && (
                        <span> · then ${PLANS.find((p) => p.tier === tier)?.price ?? '—'}/month</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">
                      ${PLANS.find((p) => p.tier === tier)?.price ?? '—'}/month · billed monthly
                      {currentPeriodEnd && cancelAtPeriodEnd && (
                        <span> · cancels {formatDate(currentPeriodEnd)}</span>
                      )}
                    </p>
                  )}
                  {cancelAtPeriodEnd && (
                    <p className="text-xs text-amber-600 mt-1 font-medium">
                      Subscription will not renew. You can resubscribe anytime.
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={handleBillingPortal}
                  disabled={portalLoading}
                  className="gap-2"
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Manage Billing
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Change plan, update payment method, or view invoices in the billing portal.
              </p>
            </div>
          ) : (
            /* No active subscription — show plan picker */
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Choose a plan to unlock all features. Every plan includes a 14-day free trial.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {PLANS.map((plan) => (
                  <div
                    key={plan.tier}
                    className={`rounded-xl border-2 p-4 transition-all ${
                      plan.popular
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {plan.popular && (
                      <div className="text-xs font-semibold text-blue-600 mb-2">MOST POPULAR</div>
                    )}
                    <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                    <p className="text-xs text-gray-500 mb-2">{plan.desc}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${plan.price}
                      <span className="text-sm font-normal text-gray-500">/mo</span>
                    </p>
                    <ul className="mt-3 space-y-1 mb-4">
                      {plan.features.map((f) => (
                        <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5">
                          <Check className="h-3 w-3 text-blue-600 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="sm"
                      className={`w-full ${
                        plan.popular ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
                      }`}
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(plan.tier)}
                      disabled={checkoutLoading !== null}
                    >
                      {checkoutLoading === plan.tier ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        'Start Free Trial'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 text-center">
                14-day free trial on all plans · Cancel anytime
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage This Month */}
      {isActive && (
        <Card className="border-gray-100">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Usage This Month
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {usageLoading ? (
              <div className="space-y-3">
                <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
                <div className="h-2 w-full bg-gray-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Receipts uploaded</span>
                    <span className="font-medium text-gray-900">
                      {receiptsUsed}{receiptsLimit === -1 ? '' : ` / ${receiptsLimit}`}
                    </span>
                  </div>
                  {receiptsLimit !== -1 ? (
                    <Progress
                      value={Math.min(usagePercent, 100)}
                      className={`h-2.5 ${
                        isAtLimit
                          ? '[&>div]:bg-red-500'
                          : isNearLimit
                            ? '[&>div]:bg-amber-500'
                            : '[&>div]:bg-blue-600'
                      }`}
                    />
                  ) : (
                    <p className="text-xs text-gray-500">Unlimited receipts on the Enterprise plan.</p>
                  )}
                </div>

                {isAtLimit && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      You&apos;ve reached your monthly receipt limit. Upgrade your plan to continue uploading.
                      <Button
                        variant="link"
                        className="text-red-800 underline h-auto p-0 ml-1"
                        onClick={handleBillingPortal}
                        disabled={portalLoading}
                      >
                        Upgrade now →
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {isNearLimit && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      You&apos;re at {usagePercent}% of your monthly limit. Consider upgrading to avoid disruption.
                    </AlertDescription>
                  </Alert>
                )}

                {receiptsLimit !== -1 && !isAtLimit && !isNearLimit && (
                  <p className="text-xs text-gray-500">
                    {receiptsLimit - receiptsUsed} receipts remaining this billing period.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg text-red-700">
            <Trash2 className="h-5 w-5 text-red-600" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOwner ? (
            <p className="text-sm text-gray-600">
              Permanently delete your account and all associated data — trucks, drivers, receipts,
              reports, and team members. <strong>This action is irreversible.</strong>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Remove your account from this team and delete your login.
              The team&apos;s data (trucks, receipts, reports) will <strong>not</strong> be affected.
            </p>
          )}

          {!deleteConfirmOpen ? (
            <Button
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete My Account
            </Button>
          ) : (
            <div className="space-y-3 border border-red-200 rounded-lg p-4 bg-red-50">
              <Alert className="border-red-300 bg-red-100">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 font-medium">
                  {isOwner
                    ? 'All your data will be permanently deleted from the database. This cannot be undone.'
                    : 'Your login will be deleted and you will be removed from the team. Team data is not affected.'}
                </AlertDescription>
              </Alert>
              <p className="text-sm text-gray-700">
                Type <span className="font-mono font-bold">DELETE</span> to confirm:
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="border-red-300 focus-visible:ring-red-400"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirmText(''); }}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                >
                  {deleting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
                  ) : (
                    'Permanently Delete Account'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
