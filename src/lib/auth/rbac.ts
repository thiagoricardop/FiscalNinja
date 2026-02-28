/**
 * FiscalNinja — Server-side RBAC helpers
 *
 * Use in API routes and Server Actions:
 *
 *   const user = await getCurrentUser();
 *   requirePermission(user, 'receipts.delete');
 *   // safe to proceed …
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import {
  type Permission,
  type RBACUser,
  type UserRole,
  hasPermission,
  effectiveOwnerId,
} from './permissions';

// Re-export for convenience
export { hasPermission, hasAllPermissions, hasAnyPermission, effectiveOwnerId } from './permissions';
export type { Permission, RBACUser, UserRole } from './permissions';

// ═══════════════════════════════════════════════════════
// GET CURRENT USER + ROLE
// ═══════════════════════════════════════════════════════

/**
 * Fetch the authenticated user from Supabase, join with their profile
 * to obtain `role` and `parent_user_id`, and optionally fetch per-user
 * permission overrides from `team_members`.
 *
 * Returns `null` when not authenticated.
 */
export async function getCurrentUser(): Promise<RBACUser | null> {
  const cookieStore = cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // set() only in Server Actions / Route Handlers
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // remove() only in Server Actions / Route Handlers
          }
        },
      },
    },
  );

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  // Fetch profile (role + parent)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, parent_user_id')
    .eq('id', authUser.id)
    .single();

  const role: UserRole = (profile?.role as UserRole) ?? 'owner';
  const parentUserId: string | null = (profile?.parent_user_id as string) ?? null;

  // Fetch per-user permission overrides (if this user is a team member)
  let overrides: Partial<Record<Permission, boolean>> | undefined;
  if (role !== 'owner' && parentUserId) {
    const { data: membership } = await supabase
      .from('team_members')
      .select('permissions')
      .eq('owner_id', parentUserId)
      .eq('user_id', authUser.id)
      .eq('active', true)
      .single();

    if (membership?.permissions && typeof membership.permissions === 'object') {
      overrides = membership.permissions as Partial<Record<Permission, boolean>>;
    }
  }

  return {
    id: authUser.id,
    role,
    parent_user_id: parentUserId,
    overrides,
  };
}

// ═══════════════════════════════════════════════════════
// GUARDS
// ═══════════════════════════════════════════════════════

/**
 * Throw if the user lacks the given permission.
 * Use inside API routes / Server Actions after calling `getCurrentUser()`.
 */
export function requirePermission(user: RBACUser | null, permission: Permission): void {
  if (!user) {
    throw new ForbiddenError('Not authenticated');
  }
  if (!hasPermission(user, permission)) {
    throw new ForbiddenError(
      `Role "${user.role}" does not have "${permission}" permission`,
    );
  }
}

/**
 * A convenience error class so callers can detect permission failures.
 */
export class ForbiddenError extends Error {
  public readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

// ═══════════════════════════════════════════════════════
// API ROUTE HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Wraps an API route handler with authentication + permission check.
 *
 * Usage:
 * ```ts
 * export const DELETE = withPermission('receipts.delete', async (req, user) => {
 *   // user is guaranteed to have the permission
 *   return NextResponse.json({ ok: true });
 * });
 * ```
 */
export function withPermission(
  permission: Permission,
  handler: (req: Request, user: RBACUser) => Promise<NextResponse | Response>,
) {
  return async function protectedHandler(req: Request): Promise<NextResponse | Response> {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user, permission)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: `Missing permission: ${permission}`,
        },
        { status: 403 },
      );
    }

    return handler(req, user);
  };
}

/**
 * Same as `withPermission` but for handlers that require ANY of the
 * listed permissions (OR check).
 */
export function withAnyPermission(
  permissions: Permission[],
  handler: (req: Request, user: RBACUser) => Promise<NextResponse | Response>,
) {
  return async function protectedHandler(req: Request): Promise<NextResponse | Response> {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const granted = permissions.some((p) => hasPermission(user, p));
    if (!granted) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: `Missing one of: ${permissions.join(', ')}`,
        },
        { status: 403 },
      );
    }

    return handler(req, user);
  };
}
