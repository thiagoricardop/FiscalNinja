/**
 * Form validation utilities for authentication
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_REGEX.test(email)) return 'Please enter a valid email address';
  return null;
}

export type PasswordStrength = 'weak' | 'medium' | 'strong';

export interface PasswordValidation {
  isValid: boolean;
  strength: PasswordStrength;
  score: number;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 8) {
    errors.push('At least 8 characters');
  } else {
    score++;
    if (password.length >= 12) score++;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('One lowercase letter');
  } else {
    score++;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('One uppercase letter');
  } else {
    score++;
  }

  if (!/[0-9]/.test(password)) {
    errors.push('One number');
  } else {
    score++;
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('One special character');
  } else {
    score++;
  }

  let strength: PasswordStrength;
  if (score <= 2) strength = 'weak';
  else if (score <= 4) strength = 'medium';
  else strength = 'strong';

  return {
    isValid: errors.length === 0,
    strength,
    score,
    errors,
  };
}

export function getPasswordStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'strong':
      return 'bg-green-500';
  }
}

export function getPasswordStrengthWidth(score: number): string {
  const percent = Math.min((score / 6) * 100, 100);
  return `${percent}%`;
}
