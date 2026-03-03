'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface UseUserReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

/** Timeout (ms) for initial getUser call — prevents infinite loading. */
const GET_USER_TIMEOUT = 10_000;

/**
 * Race a promise against a timeout.
 * Resolves with `fallback` if the promise doesn't settle in time.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * Custom hook for accessing the current Supabase user.
 * Listens for auth state changes and keeps the user in sync.
 *
 * If the JWT has expired and the token refresh hangs, the hook will
 * time out after GET_USER_TIMEOUT ms, sign the user out, and redirect
 * to the login page so they're never stuck on an infinite loader.
 */
export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const getInitialUser = async () => {
      try {
        // First try to get the session — this also triggers a refresh if
        // the access token is expired but the refresh token is still valid.
        const { data: sessionData } = await withTimeout(
          supabase.auth.getSession(),
          GET_USER_TIMEOUT,
          { data: { session: null }, error: null } as any,
        );

        if (!sessionData?.session) {
          // No valid session — clean up and redirect if we were
          // previously authenticated (stale cookie / expired refresh token).
          await supabase.auth.signOut().catch(() => {});
          if (mounted) {
            setUser(null);
            setSession(null);
            setLoading(false);
          }
          return;
        }

        // Session exists — fetch the validated user
        const { data: { user: authUser } } = await withTimeout(
          supabase.auth.getUser(),
          GET_USER_TIMEOUT,
          { data: { user: null }, error: null } as any,
        );

        if (!authUser) {
          // Token may have been invalidated server-side
          await supabase.auth.signOut().catch(() => {});
          if (mounted) {
            setUser(null);
            setSession(null);
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          setUser(authUser);
          setSession(sessionData.session);
          setLoading(false);
        }
      } catch {
        // Network error or unexpected failure — force logout so the user
        // isn't stuck forever.
        await supabase.auth.signOut().catch(() => {});
        if (mounted) {
          setUser(null);
          setSession(null);
          setLoading(false);
        }
      }
    };

    getInitialUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: string, newSession: Session | null) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !newSession) {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        if (newSession) {
          const { data: { user: authUser } } = await withTimeout(
            supabase.auth.getUser(),
            GET_USER_TIMEOUT,
            { data: { user: null }, error: null } as any,
          );
          if (mounted) {
            setSession(newSession);
            setUser(authUser);
          }
        } else {
          setSession(null);
          setUser(null);
        }
        if (mounted) setLoading(false);
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading };
}
