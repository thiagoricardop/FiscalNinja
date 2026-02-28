'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthWidth } from '@/lib/auth/validation';
import { getAuthErrorMessage } from '@/lib/auth/errors';
import AuthLayout from '@/components/auth/AuthLayout';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check, X, ArrowRight, ShieldCheck } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordValidation = password ? validatePassword(password) : null;

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!passwordValidation?.isValid) {
      setError('Please meet all password requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(getAuthErrorMessage(updateError.message));
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 2000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err?.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout>
        <div className="space-y-6 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-green-50 flex items-center justify-center ring-4 ring-green-100">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Password updated!
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your password has been successfully reset. Redirecting you to the
              dashboard...
            </p>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full animate-pulse w-full" />
          </div>
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
            Set new password
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a strong password to secure your account.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              New Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              autoComplete="new-password"
              disabled={loading}
              className="h-11"
              required
            />

            {password && passwordValidation && (
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getPasswordStrengthColor(
                      passwordValidation.strength
                    )}`}
                    style={{
                      width: getPasswordStrengthWidth(passwordValidation.score),
                    }}
                  />
                </div>
                <span
                  className={`text-xs font-medium capitalize ${
                    passwordValidation.strength === 'strong'
                      ? 'text-green-600'
                      : passwordValidation.strength === 'medium'
                      ? 'text-yellow-600'
                      : 'text-red-500'
                  }`}
                >
                  {passwordValidation.strength}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              disabled={loading}
              className="h-11"
              required
            />
            {passwordsMatch && (
              <p className="text-xs text-green-600 flex items-center gap-1.5">
                <Check className="h-3 w-3" />
                Passwords match
              </p>
            )}
            {passwordsMismatch && (
              <p className="text-xs text-red-500 flex items-center gap-1.5">
                <X className="h-3 w-3" />
                Passwords do not match
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating password...
              </>
            ) : (
              <>
                Update Password
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
            Secured with 256-bit SSL encryption
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
