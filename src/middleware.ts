import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ═══════════════════════════════════════════════════════
// RATE LIMITING — 100 req/min per IP (in-memory store)
// ═══════════════════════════════════════════════════════

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 100;

/**
 * Sliding-window rate-limit store.
 * Each entry is an array of request timestamps for a given IP.
 * Stale entries are pruned on every check to prevent unbounded growth.
 */
const rateLimitStore = new Map<string, number[]>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

function checkRateLimit(ip: string): { limited: boolean; remaining: number } {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  // Prune globally (cheap — runs once per request, not per entry)
  if (rateLimitStore.size > 10_000) {
    for (const [key, ts] of rateLimitStore) {
      if (ts[ts.length - 1] < cutoff) rateLimitStore.delete(key);
    }
  }

  const timestamps = (rateLimitStore.get(ip) ?? []).filter((t) => t > cutoff);
  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - timestamps.length);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitStore.set(ip, timestamps);
    return { limited: true, remaining: 0 };
  }

  timestamps.push(now);
  rateLimitStore.set(ip, timestamps);
  return { limited: false, remaining: remaining - 1 };
}

// ═══════════════════════════════════════════════════════
// CSRF PROTECTION
// ═══════════════════════════════════════════════════════

const CSRF_COOKIE_NAME = '__Host-csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ═══════════════════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════════════════

function applySecurityHeaders(res: NextResponse): void {
  // Prevent click-jacking
  res.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME-type sniffing
  res.headers.set('X-Content-Type-Options', 'nosniff');

  // Control referrer information
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Legacy XSS filter (still respected by some browsers)
  res.headers.set('X-XSS-Protection', '1; mode=block');

  // Restrict browser features
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );

  // Strict Transport Security (180 days)
  res.headers.set(
    'Strict-Transport-Security',
    'max-age=15552000; includeSubDomains',
  );

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    // Next.js requires inline scripts + eval for HMR / dev; nonce-based would
    // be ideal but is not easy to wire through Next's middleware today.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
  res.headers.set('Content-Security-Policy', csp);
}

// ═══════════════════════════════════════════════════════
// INPUT SANITIZATION (query-string & path)
// ═══════════════════════════════════════════════════════

/** Returns `false` if the request contains suspect XSS patterns. */
function isSafeRequest(req: NextRequest): boolean {
  const xssPattern =
    /<script[\s>]|javascript\s*:|on(?:load|error|click|mouse|focus|blur)\s*=/i;

  // Check query params
  for (const [, value] of req.nextUrl.searchParams) {
    if (xssPattern.test(value)) return false;
  }

  // Check path segments for encoded payloads
  const decoded = decodeURIComponent(req.nextUrl.pathname);
  if (xssPattern.test(decoded)) return false;

  return true;
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

/** Create a NextResponse.redirect with security headers applied. */
function secureRedirect(url: URL, req: NextRequest): NextResponse {
  const redir = NextResponse.redirect(url);
  applySecurityHeaders(redir);
  return redir;
}

// ═══════════════════════════════════════════════════════
// MIDDLEWARE ENTRY
// ═══════════════════════════════════════════════════════

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  // ─── 1. Rate Limiting ─────────────────────────────
  const { limited, remaining } = checkRateLimit(ip);
  if (limited) {
    const res = new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
          'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
    applySecurityHeaders(res);
    return res;
  }

  // ─── 2. Input Sanitization ────────────────────────
  if (!isSafeRequest(req)) {
    const res = new NextResponse(
      JSON.stringify({ error: 'Bad request — potentially unsafe input.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
    applySecurityHeaders(res);
    return res;
  }

  // ─── 3. Build next response ───────────────────────
  const res = NextResponse.next();
  applySecurityHeaders(res);

  // Add rate-limit info headers
  res.headers.set('X-RateLimit-Limit', String(MAX_REQUESTS_PER_WINDOW));
  res.headers.set('X-RateLimit-Remaining', String(remaining));

  // ─── 4. CSRF Protection ───────────────────────────
  //   • On GET → issue a CSRF cookie if none exists
  //   • On mutations → verify the header matches the cookie
  //   • Skip for Supabase auth callback and static pages
  const skipCsrf =
    pathname.startsWith('/api') ||
    pathname.includes('/auth/callback') ||
    pathname.startsWith('/_next');

  if (MUTATION_METHODS.has(req.method) && !skipCsrf) {
    const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
    const headerToken = req.headers.get(CSRF_HEADER_NAME);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      const forbidden = new NextResponse(
        JSON.stringify({ error: 'CSRF token validation failed.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
      applySecurityHeaders(forbidden);
      return forbidden;
    }
  }

  // Issue CSRF token cookie on safe methods
  if (req.method === 'GET' && !skipCsrf) {
    let csrfToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
    if (!csrfToken) {
      csrfToken = generateToken();
    }
    res.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false, // client JS needs to read it for the header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 4, // 4 hours
    });
  }

  // ─── 5. Authentication (Supabase JWT) ─────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = pathname.startsWith('/auth');
  const isDashboard = pathname.startsWith('/dashboard');
  const isOnboarding = pathname.startsWith('/onboarding');
  const isDriverPortal = pathname.startsWith('/driver');
  const isProtected = isDashboard || isOnboarding || isDriverPortal;

  // Redirect to login if accessing protected route without session
  if (isProtected && !user) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return secureRedirect(loginUrl, req);
  }

  // Redirect to dashboard/driver if accessing auth pages with active session
  if (isAuthPage && user && !pathname.includes('/auth/callback')) {
    // Check role to decide where to redirect logged-in users
    const { data: authProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const dest = authProfile?.role === 'driver' ? '/driver' : '/dashboard';
    return secureRedirect(new URL(dest, req.url), req);
  }

  // If authenticated and visiting dashboard, ensure onboarding is complete
  // and enforce role-based route restrictions
  if (isDashboard && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, role, parent_user_id')
      .eq('id', user.id)
      .single();

    if (profile && !profile.onboarding_completed) {
      return secureRedirect(new URL('/onboarding', req.url), req);
    }

    // ─── 6. Role-based route restrictions ──────────
    const role = (profile?.role as string) ?? 'owner';

    // Drivers should use the /driver portal, not /dashboard
    if (role === 'driver') {
      return secureRedirect(new URL('/driver', req.url), req);
    }

    // Only owners can access team management, subscription, billing
    if (role !== 'owner') {
      if (pathname.startsWith('/dashboard/settings/team') ||
          pathname.startsWith('/dashboard/billing') ||
          pathname.startsWith('/dashboard/subscription')) {
        return secureRedirect(new URL('/dashboard', req.url), req);
      }
    }

    // Pass role info downstream via headers (readable by server components)
    res.headers.set('x-user-role', role);
    res.headers.set('x-user-id', user.id);
    if (profile?.parent_user_id) {
      res.headers.set('x-parent-user-id', profile.parent_user_id as string);
    }
  }

  // ─── 7. Driver portal route guard ─────────────
  if (isDriverPortal && user) {
    const { data: driverProfile } = await supabase
      .from('profiles')
      .select('onboarding_completed, role')
      .eq('id', user.id)
      .single();

    if (driverProfile && !driverProfile.onboarding_completed) {
      return secureRedirect(new URL('/onboarding', req.url), req);
    }

    // Only drivers can access /driver — redirect others to /dashboard
    if (driverProfile?.role !== 'driver') {
      return secureRedirect(new URL('/dashboard', req.url), req);
    }

    res.headers.set('x-user-role', driverProfile.role);
    res.headers.set('x-user-id', user.id);
  }

  return res;
}

// ═══════════════════════════════════════════════════════
// ROUTE MATCHER
// ═══════════════════════════════════════════════════════

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api          (API routes — protected by their own auth)
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico  (browser icon)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
