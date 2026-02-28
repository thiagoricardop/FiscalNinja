'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getAuthErrorMessage } from '@/lib/auth/errors';
import AuthLayout from '@/components/auth/AuthLayout';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, ArrowLeft, CheckCircle2, Inbox } from 'lucide-react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!email) {
      setError('No email address found. Please try signing up again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (resendError) {
        setError(getAuthErrorMessage(resendError.message));
        setLoading(false);
        return;
      }

      setResent(true);
      setLoading(false);
      setTimeout(() => setResent(false), 5000);
    } catch (err: any) {
      console.error('Resend error:', err);
      setError(err?.message || 'Failed to resend verification email. Please try again.');
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="lg:hidden text-center mb-2">
          <h2 className="text-xl font-bold text-blue-600">FiscalNinja</h2>
        </div>

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center ring-4 ring-blue-100">
            <Inbox className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a verification link to{' '}
            {email ? (
              <strong className="text-gray-700">{email}</strong>
            ) : (
              'your email address'
            )}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {resent && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Verification email resent! Check your inbox.
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-sm space-y-3">
          <p className="font-semibold text-gray-900">What to do next:</p>
          <ol className="space-y-3">
            {[
              'Open the email from FiscalNinja',
              'Click the "Confirm your email" button',
              "You'll be signed in automatically",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-muted-foreground">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Resend */}
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive the email?
          </p>
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={loading || resent}
            className="w-full h-11 text-sm font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resending...
              </>
            ) : resent ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                Email Resent!
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Resend Verification Email
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Make sure to check your spam or junk folder.
          </p>
        </div>

        {/* Back link */}
        <Link href="/auth/login" className="block">
          <Button variant="ghost" className="w-full h-11 text-sm font-semibold text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sign in
          </Button>
        </Link>
      </div>
    </AuthLayout>
  );
}
