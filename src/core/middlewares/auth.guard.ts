/**
 * Authorization Guards (RBAC + PBAC)
 *
 * Critical fixes:
 *
 * 1. N+1 DATABASE QUERIES — Each `hasPermission` / `hasAllPermissions` /
 *    `hasRole` call fetched the full user + role + all permissions from DB on
 *    EVERY protected request. For a request pipeline with multiple guards this
 *    is 3+ sequential DB round-trips. Fixed by using a single optimised query
 *    and caching permissions in req.user (which is already set by authenticate()).
 *    The access token already contains `role` and `permissions[]`, so for the
 *    vast majority of requests we can skip the DB entirely and check the JWT
 *    payload — which is cryptographically verified. Only when we need liveness
 *    (e.g. an admin revoked a role mid-session) should we hit the DB.
 *
 * 2. req.user typed as `any` everywhere. Now uses AccessTokenPayload.
 *
 * 3. `checkBranchAccess` referenced `user.branchId` which does NOT exist on
 *    the User model in the Prisma schema — it's a dead field that would have
 *    silently set req.branchId to undefined on every request.
 *
 * 4. `policyGuard` passed `req.body || req.params` as the resource which is
 *    untyped and unsafe. Changed to a properly typed callback signature.
 *
 * 5. `userHasPermission` / `getUserPermissions` were duplicated between this
 *    file and auth.service.ts. Retained here as the canonical location.
 *
 * 6. Removed `branchId` from the global Request augmentation since the User
 *    schema has no branchId column. If branch management is added later, it
 *    should be added to the schema first.
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '@/infrastructure/database/prisma';
import { AuthorizationError } from '@/core/errors/AppError';
import type { AccessTokenPayload } from '@/core/utils';

// ============================================================================
// INTERNAL — single DB fetch for a user's effective permission set
// ============================================================================

async function fetchEffectivePermissions(userId: string): Promise<Set<string>> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: {
        select: {
          permissions: { select: { code: true } },
        },
      },
      permissions: {
        where: { expiresAt: null },           // ignore expired direct grants
        select: { permission: { select: { code: true } } },
      },
    },
  });

  if (!user) return new Set();

  const set = new Set<string>();
  for (const p of user.role.permissions) set.add(p.code);
  for (const up of user.permissions) set.add(up.permission.code);
  return set;
}

// ============================================================================
// FAST-PATH: check JWT payload first (avoids DB for most requests)
// ============================================================================

function permissionsFromToken(req: Request): string[] | null {
  const u = req.user as AccessTokenPayload | undefined;
  return u?.permissions ?? null;
}

// ============================================================================
// RBAC MIDDLEWARE
// ============================================================================

/**
 * Checks the user's primary role (from verified JWT) against the allowed list.
 * No DB call required — role is embedded in the signed access token.
 */
export function hasRole(...requiredRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user as AccessTokenPayload | undefined;
    if (!user) return next(new AuthorizationError('User not authenticated'));

    if (!requiredRoles.includes(user.role)) {
      return next(
        new AuthorizationError(`Access denied. Required roles: ${requiredRoles.join(', ')}`)
      );
    }
    next();
  };
}

// ============================================================================
// PBAC MIDDLEWARE — any of the listed permissions
// ============================================================================

/**
 * Checks that the user holds at LEAST ONE of the required permissions.
 * Fast path: reads permissions from the verified JWT payload.
 * Slow path: falls back to a single DB query if the token has no permissions array.
 */
export function hasPermission(...requiredPermissions: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as AccessTokenPayload | undefined;
    if (!user) return next(new AuthorizationError('User not authenticated'));

    try {
      const tokenPerms = permissionsFromToken(req);
      const perms: ReadonlySet<string> = tokenPerms
        ? new Set(tokenPerms)
        : await fetchEffectivePermissions(user.userId);

      if (!requiredPermissions.some((p) => perms.has(p))) {
        return next(
          new AuthorizationError(
            `Access denied. Required permissions: ${requiredPermissions.join(', ')}`
          )
        );
      }
      next();
    } catch {
      next(new AuthorizationError('Permission check failed'));
    }
  };
}

// ============================================================================
// PBAC MIDDLEWARE — ALL listed permissions required
// ============================================================================

export function hasAllPermissions(...requiredPermissions: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as AccessTokenPayload | undefined;
    if (!user) return next(new AuthorizationError('User not authenticated'));

    try {
      const tokenPerms = permissionsFromToken(req);
      const perms: ReadonlySet<string> = tokenPerms
        ? new Set(tokenPerms)
        : await fetchEffectivePermissions(user.userId);

      if (!requiredPermissions.every((p) => perms.has(p))) {
        return next(
          new AuthorizationError(
            `Access denied. All permissions required: ${requiredPermissions.join(', ')}`
          )
        );
      }
      next();
    } catch {
      next(new AuthorizationError('Permission check failed'));
    }
  };
}

// ============================================================================
// RESOURCE OWNERSHIP — stores param for downstream service-layer IDOR check
// ============================================================================

/**
 * Stores the route param identified by `resourceIdParam` into req.resourceId
 * and req.ownerId. The service layer is responsible for the actual ownership
 * assertion against the database — this middleware is intentionally lightweight.
 */
export function checkResourceOwnership(resourceIdParam = 'id') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user as AccessTokenPayload | undefined;
    if (!user) return next(new AuthorizationError('User not authenticated'));

    const resourceId = req.params[resourceIdParam];
    if (!resourceId) {
      return next(new AuthorizationError('Resource ID not found in request'));
    }

    req.resourceId = resourceId;
    req.ownerId = user.userId;
    next();
  };
}

// ============================================================================
// SCOPE ENFORCEMENT
// ============================================================================

export function enforceScope(scopeField: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user as AccessTokenPayload | undefined;
    if (!user) return next(new AuthorizationError('User not authenticated'));

    req.scope = { field: scopeField, userId: user.userId };
    next();
  };
}

// ============================================================================
// POLICY GUARD
// ============================================================================

type PolicyFn = (user: AccessTokenPayload, req: Request) => boolean;

export function policyGuard(policyFn: PolicyFn) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user as AccessTokenPayload | undefined;
    if (!user) return next(new AuthorizationError('User not authenticated'));

    if (!policyFn(user, req)) {
      return next(new AuthorizationError('Access denied by policy'));
    }
    next();
  };
}

// ============================================================================
// SERVICE LAYER HELPERS
// ============================================================================

export async function userHasPermission(
  userId: string,
  permissionCode: string
): Promise<boolean> {
  const perms = await fetchEffectivePermissions(userId);
  return perms.has(permissionCode);
}

export async function userHasRole(userId: string, roleName: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: { select: { name: true } } },
  });
  return user?.role.name === roleName;
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  return Array.from(await fetchEffectivePermissions(userId));
}