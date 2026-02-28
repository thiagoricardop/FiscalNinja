/**
 * Maps Supabase auth error messages to user-friendly messages.
 */

const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Invalid email or password. Please try again.',
  'Email not confirmed': 'Please verify your email address before signing in.',
  'User already registered': 'An account with this email already exists.',
  'Password should be at least 6 characters':
    'Password must be at least 8 characters long.',
  'Email rate limit exceeded':
    'Too many attempts. Please wait a few minutes and try again.',
  'For security purposes, you can only request this after':
    'Please wait before requesting another email.',
  'New password should be different from the old password.':
    'Your new password must be different from your current password.',
  'Auth session missing!': 'Your session has expired. Please sign in again.',
  'Token has expired or is invalid':
    'This link has expired. Please request a new one.',
};

export function getAuthErrorMessage(error: string): string {
  // Check for exact match first
  if (ERROR_MAP[error]) return ERROR_MAP[error];

  // Check for partial match
  for (const [key, message] of Object.entries(ERROR_MAP)) {
    if (error.includes(key)) return message;
  }

  // Return the original error so users (and devs) can see what actually went wrong
  console.error('[Auth Error]', error);
  return error || 'Something went wrong. Please try again.';
}
