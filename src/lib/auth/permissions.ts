/**
 * FiscalNinja — Role-Based Access Control (RBAC)
 *
 * Central permission definitions.
 * Import `hasPermission`, `requirePermission`, or `ROLE_PERMISSIONS`
 * wherever you need to gate access.
 */

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

/** All roles supported by the system. */
export type UserRole = 'owner' | 'manager' | 'driver';

/** Granular permissions. Naming convention: `resource.action[.scope]` */
export type Permission =
  | 'receipts.view.all'
  | 'receipts.view.own'
  | 'receipts.upload'
  | 'receipts.edit'
  | 'receipts.delete'
  | 'reports.view'
  | 'reports.export'
  | 'team.manage'
  | 'team.view'
  | 'drivers.manage'
  | 'trucks.manage'
  | 'settings.view'
  | 'settings.edit'
  | 'subscription.manage'
  | 'categories.manage';

/** A user-like object carrying the fields we need for permission checks. */
export interface RBACUser {
  id: string;
  role: UserRole;
  parent_user_id: string | null;
  /** Optional per-user overrides from team_members.permissions */
  overrides?: Partial<Record<Permission, boolean>>;
}

// ═══════════════════════════════════════════════════════
// ROLE → PERMISSION MAP
// ═══════════════════════════════════════════════════════

export const ROLE_PERMISSIONS: Readonly<Record<UserRole, ReadonlySet<Permission>>> = {
  owner: new Set<Permission>([
    'receipts.view.all',
    'receipts.view.own',
    'receipts.upload',
    'receipts.edit',
    'receipts.delete',
    'reports.view',
    'reports.export',
    'team.manage',
    'team.view',
    'drivers.manage',
    'trucks.manage',
    'settings.view',
    'settings.edit',
    'subscription.manage',
    'categories.manage',
  ]),

  manager: new Set<Permission>([
    'receipts.view.all',
    'receipts.view.own',
    'receipts.upload',
    'receipts.edit',
    'reports.view',
    'reports.export',
    'team.view',
    'drivers.manage',
    'trucks.manage',
    'settings.view',
    'categories.manage',
  ]),

  driver: new Set<Permission>([
    'receipts.view.own',
    'receipts.upload',
    'reports.view', // read-only dashboard
  ]),
};

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Check whether a user holds a specific permission.
 *
 * 1. Look at per-user overrides (from team_members.permissions) first.
 * 2. Fall back to the role's default permission set.
 */
export function hasPermission(user: RBACUser, permission: Permission): boolean {
  // Per-user override takes priority
  if (user.overrides && permission in user.overrides) {
    return !!user.overrides[permission];
  }
  return ROLE_PERMISSIONS[user.role]?.has(permission) ?? false;
}

/** Check multiple permissions (AND). */
export function hasAllPermissions(user: RBACUser, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(user, p));
}

/** Check multiple permissions (OR). */
export function hasAnyPermission(user: RBACUser, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

/**
 * Returns the "effective owner" for data queries.
 * - Owners → their own id
 * - Managers / drivers → their parent_user_id
 */
export function effectiveOwnerId(user: RBACUser): string {
  return user.role === 'owner' ? user.id : (user.parent_user_id ?? user.id);
}

/**
 * Human-readable label for a role.
 */
export function roleLabel(role: UserRole): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'manager':
      return 'Manager';
    case 'driver':
      return 'Driver';
    default:
      return role;
  }
}

/**
 * All permissions available in the system (useful for admin UI).
 */
export const ALL_PERMISSIONS: readonly Permission[] = [
  'receipts.view.all',
  'receipts.view.own',
  'receipts.upload',
  'receipts.edit',
  'receipts.delete',
  'reports.view',
  'reports.export',
  'team.manage',
  'team.view',
  'drivers.manage',
  'trucks.manage',
  'settings.view',
  'settings.edit',
  'subscription.manage',
  'categories.manage',
] as const;

/**
 * Friendly descriptions for each permission (for team-management UIs).
 */
export const PERMISSION_LABELS: Record<Permission, string> = {
  'receipts.view.all': 'View all receipts',
  'receipts.view.own': 'View own receipts',
  'receipts.upload': 'Upload receipts',
  'receipts.edit': 'Edit receipts',
  'receipts.delete': 'Delete receipts',
  'reports.view': 'View reports & dashboard',
  'reports.export': 'Export reports (PDF / Excel)',
  'team.manage': 'Manage team members',
  'team.view': 'View team list',
  'drivers.manage': 'Manage drivers',
  'trucks.manage': 'Manage trucks',
  'settings.view': 'View settings',
  'settings.edit': 'Edit settings',
  'subscription.manage': 'Manage subscription & billing',
  'categories.manage': 'Manage expense categories',
};
