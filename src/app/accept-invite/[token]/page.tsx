'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import Link from 'next/link';
import Logo from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Truck,
  ShieldCheck,
  LogIn,
} from 'lucide-react';

interface InviteInfo {
  email: string;
  role: string;
  company_name: string;
  owner_name: string | null;
}

export default function AcceptInvitePage({
  params,
}: {
  params: { token: string };
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch invite info
  useEffect(() => {
    fetch(`/api/team/accept/${params.token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }
        return res.json();
      })
      .then((data) => setInvite(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.token]);

  const handleAccept = async () => {
    setAccepting(true);
    setError('');
    try {
      const res = await fetch(`/api/team/accept/${params.token}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
      // Redirect to onboarding so the new member sets up their profile
      setTimeout(() => router.push('/onboarding'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAccepting(false);
    }
  };

  // ─── Loading state ──────────────────────────────────

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-sm w-full mx-auto text-center">
          <div className="mb-6">
            <Logo size="lg" showText />
          </div>
          <div className="bg-white border rounded-lg p-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-gray-900 mb-2">
              Invalid Invite
            </h1>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Go to Homepage</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Success state ──────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-sm w-full mx-auto text-center">
          <div className="mb-6">
            <Logo size="lg" showText />
          </div>
          <div className="bg-white border rounded-lg p-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to {invite?.company_name}!
            </h1>
            <p className="text-sm text-gray-500 mb-2">
              You&apos;ve joined as <strong>{invite?.role}</strong>.
            </p>
            <p className="text-xs text-gray-400">
              Redirecting to setup…
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Not signed in ──────────────────────────────────

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-sm w-full mx-auto text-center">
          <div className="mb-6">
            <Logo size="lg" showText />
          </div>
          <div className="bg-white border rounded-lg p-8">
            <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-gray-900 mb-2">
              Team Invite
            </h1>
            <p className="text-sm text-gray-500 mb-1">
              <strong>{invite?.company_name}</strong> has invited you as a{' '}
              <strong>{invite?.role}</strong>.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Sign in or create an account to accept.
            </p>
            <Button asChild className="w-full gap-2">
              <Link href={`/auth/login?redirect=/accept-invite/${params.token}`}>
                <LogIn className="h-4 w-4" />
                Sign In to Accept
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main invite card ──────────────────────────────

  const RoleIcon = invite?.role === 'manager' ? ShieldCheck : Truck;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-sm w-full mx-auto text-center">
        <div className="mb-6">
          <Logo size="lg" showText />
        </div>
        <div className="bg-white border rounded-lg p-8">
          <RoleIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            Join {invite?.company_name}
          </h1>
          <p className="text-sm text-gray-500 mb-1">
            {invite?.owner_name
              ? `${invite.owner_name} has invited you`
              : 'You\'ve been invited'}{' '}
            to join as:
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full text-sm font-medium text-blue-700 mb-6">
            <RoleIcon className="h-3.5 w-3.5" />
            {invite?.role === 'manager' ? 'Manager' : 'Driver'}
          </div>

          {error && (
            <p className="text-sm text-red-600 mb-4 flex items-center justify-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}

          <Button
            className="w-full gap-2"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Accept Invite
          </Button>

          <p className="text-xs text-gray-400 mt-4">
            Signed in as {user.email}
          </p>
        </div>
      </div>
    </div>
  );
}
