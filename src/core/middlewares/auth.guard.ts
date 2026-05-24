/**
 * Authorization Middleware
 * Implements RBAC (Role-Based Access Control) and PBAC (Permission-Based Access Control)
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '@/infrastructure/database/prisma';
import { AuthorizationError, AppError } from '@/core/errors/AppError';

// ============================================================================
// ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================================================

/**
 * Middleware to check if user has a specific role
 */
export function hasRole(...requiredRoles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthorizationError('User not authenticated');
      }

      // Get user with role from database
      const user = await db.user.findUnique({
        where: { id: req.user.id },
        include: { role: true },
      });

      if (!user) {
        throw new AuthorizationError('User not found');
      }

      // Check if user's role is in required roles
      if (!requiredRoles.includes(user.role.name)) {
        throw new AuthorizationError(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error instanceof AuthorizationError ? error : new AuthorizationError('Authorization failed'));
    }
  };
}

/**
 * Middleware to check if user has a specific permission
 */
export function hasPermission(...requiredPermissions: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthorizationError('User not authenticated');
      }

      // Get user with permissions
      const user = await db.user.findUnique({
        where: { id: req.user.id },
        include: {
          role: {
            include: {
              permissions: {
                select: { code: true },
              },
            },
          },
          permissions: {
            include: {
              permission: {
                select: { code: true },
              },
            },
          },
        },
      });

      if (!user) {
        throw new AuthorizationError('User not found');
      }

      // Get all user permissions from role and direct assignments
      const userPermissions = new Set<string>();

      // Add role permissions
      user.role.permissions.forEach((p: { code: string }) => {
        userPermissions.add(p.code);
      });

      // Add direct user permissions
      user.permissions.forEach((p: { permission: { code: string } }) => {
        userPermissions.add(p.permission.code);
      });

      // Check if user has any of the required permissions
      const hasPermission = requiredPermissions.some((perm) => userPermissions.has(perm));

      if (!hasPermission) {
        throw new AuthorizationError(
          `Access denied. Required permissions: ${requiredPermissions.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(
        error instanceof AuthorizationError
          ? error
          : new AuthorizationError('Permission check failed')
      );
    }
  };
}

/**
 * Middleware to check if user has multiple permissions (all required)
 */
export function hasAllPermissions(...requiredPermissions: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthorizationError('User not authenticated');
      }

      const user = await db.user.findUnique({
        where: { id: req.user.id },
        include: {
          role: {
            include: {
              permissions: {
                select: { code: true },
              },
            },
          },
          permissions: {
            include: {
              permission: {
                select: { code: true },
              },
            },
          },
        },
      });

      if (!user) {
        throw new AuthorizationError('User not found');
      }

      const userPermissions = new Set<string>();
      user.role.permissions.forEach((p: { code: string }) => {
        userPermissions.add(p.code);
      });
      user.permissions.forEach((p: { permission: { code: string } } ) => {
        userPermissions.add(p.permission.code);
      });

      // Check if user has ALL required permissions
      const hasAllPerms = requiredPermissions.every((perm) => userPermissions.has(perm));

      if (!hasAllPerms) {
        throw new AuthorizationError(
          `Access denied. All these permissions required: ${requiredPermissions.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(
        error instanceof AuthorizationError
          ? error
          : new AuthorizationError('Permission check failed')
      );
    }
  };
}

// ============================================================================
// RESOURCE-BASED ACCESS CONTROL
// ============================================================================

/**
 * Middleware to check resource ownership
 * Ensures user can only access their own resources
 */
export function checkResourceOwnership(resourceIdParam: string = 'id') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthorizationError('User not authenticated');
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        throw new AppError('Resource ID not provided', 400, 'INVALID_REQUEST');
      }

      // Store resource ID in request for later use
      req.resourceId = resourceId;
      req.ownerId = req.user.id;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to check branch access
 * Ensures branch managers can only access their branch
 */
export function checkBranchAccess() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthorizationError('User not authenticated');
      }

      const user = await db.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        throw new AuthorizationError('User not found');
      }

      // Store branch ID in request
      req.branchId = user.branchId || undefined;

      next();
    } catch (error) {
      next(error);
    }
  };
}

// ============================================================================
// POLICY-BASED ACCESS CONTROL
// ============================================================================

/**
 * Custom policy guard for complex authorization logic
 */
export function policyGuard(
  policyFunction: (user: Record<string, any>, resource?: any) => boolean
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthorizationError('User not authenticated');
      }

      const allowed = policyFunction(req.user, req.body || req.params);

      if (!allowed) {
        throw new AuthorizationError('Access denied by policy');
      }

      next();
    } catch (error) {
      next(
        error instanceof AuthorizationError
          ? error
          : new AuthorizationError('Policy check failed')
      );
    }
  };
}

// ============================================================================
// SCOPE-BASED ACCESS CONTROL
// ============================================================================

/**
 * Middleware to enforce scope-based access
 * e.g., Users can only view transactions from their own branch
 */
export function enforceScope(scopeField: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthorizationError('User not authenticated');
      }

      // Store scope in request for service layer to use
      req.scope = {
        field: scopeField,
        userId: req.user.id,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Extend Express Request to include auth properties
declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: any;
      resourceId?: string;
      ownerId?: string;
      branchId?: string;
      scope?: {
        field: string;
        userId: string;
      };
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has permission
 */
export async function userHasPermission(
  userId: string,
  permissionCode: string
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            select: { code: true },
          },
        },
      },
      permissions: {
        include: {
          permission: {
            select: { code: true },
          },
        },
      },
    },
  });

  if (!user) {
    return false;
  }

  // Check role permissions
  if (user.role.permissions.some((p: { code: string }) => p.code === permissionCode)) {
    return true;
  }

  // Check direct permissions
  return user.permissions.some((p: { permission: { code: string } }) => p.permission.code === permissionCode);
}

/**
 * Check if user has role
 */
export async function userHasRole(userId: string, roleName: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  return user?.role.name === roleName;
}

/**
 * Get user permissions
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            select: { code: true },
          },
        },
      },
      permissions: {
        include: {
          permission: {
            select: { code: true },
          },
        },
      },
    },
  });

  if (!user) {
    return [];
  }

  const permissions = new Set<string>();

  user.role.permissions.forEach((p: { code: string }) => {
    permissions.add(p.code);
  });

  user.permissions.forEach((p: { permission: { code: string } }) => {
    permissions.add(p.permission.code);
  });

  return Array.from(permissions);
}
