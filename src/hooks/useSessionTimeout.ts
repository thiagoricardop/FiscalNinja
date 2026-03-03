'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

/**
 * Default inactivity timeout: 30 minutes.
 * "Keep me connected" extends this to 7 days (essentially no auto-logout;
 * the session relies on Supabase's own refresh-token expiry).
 */
const SHORT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const LONG_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const KEEP_CONNECTED_KEY = 'fn_keep_connected';
const LAST_ACTIVITY_KEY = 'fn_last_activity';

/** User activity events to listen for. */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'mousemove',
];

/** Throttle interval for activity events (ms). */
const THROTTLE_MS = 30_000; // 30 seconds

/**
 * Returns whether the user opted to stay connected.
 */
export function isKeepConnected(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEEP_CONNECTED_KEY) === '1';
}

/**
 * Set the "keep me connected" preference.
 */
export function setKeepConnected(value: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEEP_CONNECTED_KEY, value ? '1' : '0');
}

/**
 * Hook that monitors user activity and automatically signs out
 * after a period of inactivity.
 *
 * When `keepConnected` is true the timeout is extended to 7 days,
 * effectively letting the Supabase refresh token expire naturally.
 *
 * @param enabled  Pass `false` to disable (e.g. while auth is loading).
 */
export function useSessionTimeout(enabled: boolean = true): void {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  const getTimeout = useCallback(() => {
    return isKeepConnected() ? LONG_TIMEOUT_MS : SHORT_TIMEOUT_MS;
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore — we redirect regardless
    }
    router.push('/auth/login?reason=inactive');
  }, [router]);

  /**
   * Record activity and reset the inactivity timer.
   */
  const recordActivity = useCallback(() => {
    const now = Date.now();

    // Throttle: only update if enough time has passed
    if (now - lastTickRef.current < THROTTLE_MS) return;
    lastTickRef.current = now;

    // Persist so other tabs can read the last-active timestamp
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {
      // Storage full — non-critical
    }

    // Reset timer
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(signOutUser, getTimeout());
  }, [signOutUser, getTimeout]);

  useEffect(() => {
    if (!enabled) return;

    // ─── Check if session already timed out while the page was closed ───
    const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || '0');
    if (lastActivity > 0 && Date.now() - lastActivity > getTimeout()) {
      signOutUser();
      return;
    }

    // ─── Start initial timer ────────────────────────────────────────────
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    timerRef.current = setTimeout(signOutUser, getTimeout());

    // ─── Attach activity listeners ──────────────────────────────────────
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, recordActivity, { passive: true });
    }

    // ─── Cross-tab sync via storage events ──────────────────────────────
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        // Another tab recorded activity — reset our timer too
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(signOutUser, getTimeout());
      }
    };
    window.addEventListener('storage', handleStorage);

    // ─── Visibility change: re-check on tab focus ───────────────────────
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || '0');
        if (last > 0 && Date.now() - last > getTimeout()) {
          signOutUser();
          return;
        }
        // Reset timer from remaining time
        if (timerRef.current) clearTimeout(timerRef.current);
        const elapsed = Date.now() - last;
        const remaining = Math.max(0, getTimeout() - elapsed);
        timerRef.current = setTimeout(signOutUser, remaining);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, recordActivity);
      }
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, recordActivity, signOutUser, getTimeout]);
}
