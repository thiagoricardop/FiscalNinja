/**
 * Input sanitisation utilities for FiscalNinja
 *
 * Use these helpers in API routes, server actions and form handlers
 * to strip HTML, validate emails and prevent XSS before data reaches
 * the database or renders in the UI.
 */

// ═══════════════════════════════════════════════════════
// HTML / XSS SANITISATION
// ═══════════════════════════════════════════════════════

/** Strip all HTML tags from a string. */
export function stripHtml(input: string): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, '');
}

/** Remove `<script>`, `<style>` tags *and* their content, then strip remaining tags. */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '');
}

/** Escape characters that could be interpolated as HTML. */
export function escapeHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Returns `true` if the value looks like it contains XSS payloads:
 *   • `<script…>`
 *   • `javascript:` URIs
 *   • inline event handlers (`onerror=`, `onload=`, etc.)
 */
export function hasXssPayload(input: string): boolean {
  if (!input) return false;
  return /<script[\s>]|javascript\s*:|on(?:load|error|click|mouse|focus|blur|submit|change)\s*=/i.test(
    input,
  );
}

// ═══════════════════════════════════════════════════════
// EMAIL VALIDATION
// ═══════════════════════════════════════════════════════

/**
 * RFC-5322-inspired email regex.
 * Covers 99 % of real-world addresses. For absolute production-level
 * verification send a confirmation email instead.
 */
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_RE.test(email);
}

// ═══════════════════════════════════════════════════════
// GENERAL STRING SANITISATION
// ═══════════════════════════════════════════════════════

/** Trim + collapse whitespace + strip HTML. Useful for free-text fields. */
export function sanitizeString(input: string, maxLength = 500): string {
  if (!input) return '';
  return stripHtml(input).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/** Sanitise an entire object (shallow — string fields only). */
export function sanitizeFields<T extends Record<string, unknown>>(
  obj: T,
  maxLength = 500,
): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeString(val, maxLength);
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════
// CSRF CLIENT HELPER
// ═══════════════════════════════════════════════════════

/**
 * Read the CSRF cookie value set by the middleware.
 * Include this in fetch headers for mutation requests:
 *
 * ```ts
 * fetch('/some-route', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'x-csrf-token': getCsrfToken() ?? '',
 *   },
 *   body: JSON.stringify(data),
 * });
 * ```
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)__Host-csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}
