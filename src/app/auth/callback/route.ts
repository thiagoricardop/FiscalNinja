import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * OAuth / magic-link / email-verification callback.
 * Exchanges the auth code for a session, then:
 *  - Redirects to onboarding if not yet completed.
 *  - Otherwise redirects to dashboard (or the `next` param).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    // We need a mutable response to set cookies, but we don't know the
    // redirect target until after the session exchange, so build a temporary
    // response first and swap it out.
    const tempRes = NextResponse.redirect(new URL(next, req.url));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            tempRes.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            tempRes.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData.user) {
      // Check whether onboarding has been completed
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', sessionData.user.id)
        .single();

      const destination =
        !profile?.onboarding_completed ? '/onboarding' : next;

      const finalRes = NextResponse.redirect(new URL(destination, req.url));
      // Copy all set-cookie headers from the temp response
      tempRes.cookies.getAll().forEach((cookie) => {
        finalRes.cookies.set(cookie);
      });
      return finalRes;
    }
  }

  // Something went wrong — redirect to login with error hint
  return NextResponse.redirect(
    new URL('/auth/login?error=callback_failed', req.url)
  );
}
