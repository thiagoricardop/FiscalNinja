'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import {
  validateEmail,
  validatePassword,
  getPasswordStrengthColor,
  getPasswordStrengthWidth,
} from '@/lib/auth/validation';
import { getAuthErrorMessage } from '@/lib/auth/errors';
import AuthLayout from '@/components/auth/AuthLayout';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check, X, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordValidation = useMemo(
    () => (password ? validatePassword(password) : null),
    [password]
  );

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }

    if (!passwordValidation?.isValid) {
      setError('Please meet all password requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            company_name: companyName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        console.error('Supabase signup error:', authError);
        setError(getAuthErrorMessage(authError.message));
        setLoading(false);
        return;
      }

      // If user was created but needs email confirmation
      if (data.user && !data.session) {
        router.push('/auth/verify-email?email=' + encodeURIComponent(email));
        return;
      }

      // If auto-confirmed (dev mode)
      router.push('/onboarding');
      router.refresh();
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err?.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const PASSWORD_REQS = [
    { label: 'At least 8 characters', met: (password?.length ?? 0) >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^a-zA-Z0-9]/.test(password) },
  ];

  return (
    <AuthLayout>
      <div className="space-y-5 sm:space-y-6">
        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-2">
          <h2 className="text-xl font-bold text-blue-600">FiscalNinja</h2>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Start saving 20 hours a month
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            14-day free trial &middot; Cancel anytime
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-sm font-medium">
              Company Name
            </Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="ABC Trucking Co."
              autoComplete="organization"
              disabled={loading}
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Work Email
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

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                autoComplete="new-password"
                disabled={loading}
                className="h-11 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Password strength indicator */}
            {password && passwordValidation && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3">
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

                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {PASSWORD_REQS.map((req) => (
                    <div
                      key={req.label}
                      className={`flex items-center gap-1.5 text-xs transition-colors ${
                        req.met ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {req.met ? (
                        <Check className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <X className="h-3 w-3 flex-shrink-0" />
                      )}
                      {req.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                disabled={loading}
                className="h-11 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
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

          {/* Terms of Service */}
          <div className="flex items-start gap-3 pt-1">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked: boolean) => setAgreedToTerms(checked)}
              disabled={loading}
              className="mt-0.5"
            />
            <label
              htmlFor="terms"
              className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
            >
              I agree to the{' '}
              <Link href="/terms" className="text-blue-600 hover:underline" target="_blank">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                Privacy Policy
              </Link>
            </label>
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating your account...
              </>
            ) : (
              <>
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
            Secured with 256-bit SSL encryption
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="text-blue-600 font-semibold hover:text-blue-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
