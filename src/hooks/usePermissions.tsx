'use client';

/**
 * FiscalNinja — Client-side RBAC hook
 *
 * Provides the current user's role and permission checks
 * to any React component via `usePermissions()`.
 *
 * The hook reads the profile from Supabase on mount and
 * caches it for the session.
 */

import { useEffect, useState, useCallback, useMemo, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  type UserRole,
  type Permission,
  type RBACUser,
  hasPermission as _hasPermission,
  hasAnyPermission as _hasAnyPermission,
  hasAllPermissions as _hasAllPermissions,
  effectiveOwnerId as _effectiveOwnerId,
  ROLE_PERMISSIONS,
} from '@/lib/auth/permissions';

// Re-export types for convenience
export type { UserRole, Permission, RBACUser } from '@/lib/auth/permissions';

// ═══════════════════════════════════════════════════════
// CONTEXT (optional – for deep trees)
// ═══════════════════════════════════════════════════════

interface PermissionsContextValue {
  user: RBACUser | null;
  loading: boolean;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  isOwner: boolean;
  isManager: boolean;
  isDriver: boolean;
  effectiveOwnerId: string | null;
  refresh: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

// ═══════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const value = usePermissionsInternal();
  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════

/** Use inside <PermissionsProvider> for cached access, or standalone. */
export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (ctx) return ctx;
  // Fallback: standalone usage (will refetch on every mount)
  return usePermissionsInternal();
}

// ═══════════════════════════════════════════════════════
// INTERNAL
// ═══════════════════════════════════════════════════════

function usePermissionsInternal(): PermissionsContextValue {
  const [user, setUser] = useState<RBACUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        return;
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, parent_user_id')
        .eq('id', authUser.id)
        .single();

      const role: UserRole = (profile?.role as UserRole) ?? 'owner';
      const parentUserId: string | null = (profile?.parent_user_id as string) ?? null;

      // Fetch per-user overrides
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

      setUser({
        id: authUser.id,
        role,
        parent_user_id: parentUserId,
        overrides,
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    // Re-fetch when auth state changes (login / logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const can = useCallback(
    (permission: Permission) => (user ? _hasPermission(user, permission) : false),
    [user],
  );

  const canAny = useCallback(
    (permissions: Permission[]) => (user ? _hasAnyPermission(user, permissions) : false),
    [user],
  );

  const canAll = useCallback(
    (permissions: Permission[]) => (user ? _hasAllPermissions(user, permissions) : false),
    [user],
  );

  const ownerId = useMemo(
    () => (user ? _effectiveOwnerId(user) : null),
    [user],
  );

  return {
    user,
    loading,
    can,
    canAny,
    canAll,
    isOwner: user?.role === 'owner',
    isManager: user?.role === 'manager',
    isDriver: user?.role === 'driver',
    effectiveOwnerId: ownerId,
    refresh: fetchProfile,
  };
}

// ═══════════════════════════════════════════════════════
// GUARD COMPONENT
// ═══════════════════════════════════════════════════════

/**
 * Declarative guard — renders children only if the user
 * holds the required permission(s).
 *
 * ```tsx
 * <RequirePermission permission="receipts.delete">
 *   <DeleteButton />
 * </RequirePermission>
 * ```
 */
export function RequirePermission({
  permission,
  any,
  fallback = null,
  children,
}: {
  /** Single permission to check. */
  permission?: Permission;
  /** OR-check against multiple permissions. */
  any?: Permission[];
  /** Rendered when the user lacks access. */
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { can, canAny, loading } = usePermissions();

  if (loading) return null;

  if (permission && !can(permission)) return <>{fallback}</>;
  if (any && !canAny(any)) return <>{fallback}</>;

  return <>{children}</>;
}
