'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { validateEmail } from '@/lib/auth/validation';
import { getAuthErrorMessage } from '@/lib/auth/errors';
import AuthLayout from '@/components/auth/AuthLayout';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Mail, ArrowRight } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      );

      if (resetError) {
        setError(getAuthErrorMessage(resetError.message));
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err?.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="lg:hidden text-center mb-2">
            <h2 className="text-xl font-bold text-blue-600">FiscalNinja</h2>
          </div>

          <div className="text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-green-50 flex items-center justify-center ring-4 ring-green-100">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Check your email
            </h1>
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent a password reset link to{' '}
              <strong className="text-gray-700">{email}</strong>
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-sm space-y-3">
            <p className="font-semibold text-gray-900">Next steps:</p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Open the email from FiscalNinja</li>
              <li>Click the &quot;Reset Password&quot; link</li>
              <li>Choose a new secure password</li>
            </ol>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Didn&apos;t receive it? Check your spam folder or{' '}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-blue-600 font-semibold hover:underline"
            >
              try again
            </button>
          </p>

          <Link href="/auth/login" className="block">
            <Button variant="outline" className="w-full h-11 text-sm font-semibold">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="lg:hidden text-center mb-2">
          <h2 className="text-xl font-bold text-blue-600">FiscalNinja</h2>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Forgot your password?
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            No worries — enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              disabled={loading}
              className="h-11"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset link...
              </>
            ) : (
              <>
                Send Reset Link
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/auth/login"
            className="text-blue-600 font-semibold hover:text-blue-700 inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
