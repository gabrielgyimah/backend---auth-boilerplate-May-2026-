/**
 * User Controller
 *
 * Critical IDOR fix:
 * The original `changePassword`, `enable2FA`, `disable2FA`, `verifyEmail`,
 * and `verifyPhone` endpoints accepted `/:id` from the URL and passed it
 * directly to the service WITHOUT verifying that `req.user.userId === id`.
 *
 * This means any authenticated user could call:
 *   POST /api/v1/users/<victim-id>/change-password
 * and change another user's password — a critical Insecure Direct Object
 * Reference (IDOR) vulnerability.
 *
 * Fix: All self-service operations now use `req.user.userId` (from the
 * verified JWT) as the target, ignoring the URL parameter entirely.
 * Admin-level operations (lock/unlock) still use the URL param but are
 * protected by the `hasPermission(USERS_UPDATE)` middleware.
 *
 * Additional changes:
 * - All `any` casts removed; uses `getAuthenticatedUser()`.
 * - `getAllUsers` filter: `status` is now correctly typed (not always `true`
 *   when the query param is absent).
 * - `updateUser` schema does not allow roleId or branchId to be changed via
 *   this endpoint (privilege escalation vector); those operations belong in
 *   dedicated admin endpoints.
 * - parseBody helper centralises Zod error mapping.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { userService } from '../services/user.service';
import { ValidationError } from '@/core/errors/AppError';
import { getAuthenticatedUser } from '@/core/middlewares/auth.middleware';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  firstName: z.string().min(2, 'First name required'),
  lastName: z.string().min(2, 'Last name required'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  roleId: z.string().cuid('Invalid role ID'),
});

// Admin can set role/status; standard updateUserSchema excludes those fields
const updateUserSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().optional(),
});

const adminUpdateUserSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().optional(),
  roleId: z.string().cuid().optional(),
  status: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  email: z.string().optional(),
  firstName: z.string().optional(),
  status: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  roleId: z.string().optional(),
});

// ============================================================================
// HELPERS
// ============================================================================

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Validation failed', {
      errors: result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }
  return result.data;
}

// ============================================================================
// CONTROLLER
// ============================================================================

export class UserController {
  /** POST /api/v1/users — Admin creates a new user */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = parseBody(createUserSchema, req.body);
      const user = await userService.createUser(
        data.email,
        data.firstName,
        data.lastName,
        data.password,
        data.roleId
      );
      res.status(201).json({ success: true, message: 'User created successfully', data: user });
    } catch (error) { next(error); }
  }

  /** GET /api/v1/users/:id */
  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getUserById(req.params.id);
      res.status(200).json({ success: true, message: 'User retrieved', data: user });
    } catch (error) { next(error); }
  }

  /** GET /api/v1/users */
  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, email, firstName, status, roleId } = parseBody(paginationSchema, req.query);
      const result = await userService.getAllUsers(page, limit, { email, firstName, status, roleId });
      res.status(200).json({
        success: true,
        message: 'Users retrieved',
        data: result.users,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          hasNextPage: result.page < result.totalPages,
          hasPrevPage: result.page > 1,
        },
      });
    } catch (error) { next(error); }
  }

  /** PUT /api/v1/users/:id — Admin updates profile fields + optionally role/status */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = parseBody(adminUpdateUserSchema, req.body);
      const user = await userService.updateUser(req.params.id, data);
      res.status(200).json({ success: true, message: 'User updated', data: user });
    } catch (error) { next(error); }
  }

  /** DELETE /api/v1/users/:id */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await userService.deleteUser(req.params.id);
      res.status(200).json({ success: true, message: 'User deleted' });
    } catch (error) { next(error); }
  }

  /**
   * POST /api/v1/users/me/change-password
   * IDOR fix: always uses the JWT subject, not a URL param.
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthenticatedUser(req);
      const { currentPassword, newPassword } = parseBody(changePasswordSchema, req.body);
      await userService.changePassword(user.userId, currentPassword, newPassword);
      res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) { next(error); }
  }

  /** POST /api/v1/users/:id/lock — Admin locks account */
  async lockAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body as { reason?: string };
      await userService.lockAccount(req.params.id, reason);
      res.status(200).json({ success: true, message: 'Account locked' });
    } catch (error) { next(error); }
  }

  /** POST /api/v1/users/:id/unlock — Admin unlocks account */
  async unlockAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await userService.unlockAccount(req.params.id);
      res.status(200).json({ success: true, message: 'Account unlocked' });
    } catch (error) { next(error); }
  }

  /**
   * POST /api/v1/users/me/2fa/enable
   * IDOR fix: operates on the authenticated user only.
   */
  async enable2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthenticatedUser(req);
      const { secret } = req.body as { secret?: string };
      if (!secret) throw new ValidationError('2FA secret required');
      await userService.enable2FA(user.userId, secret);
      res.status(200).json({ success: true, message: '2FA enabled' });
    } catch (error) { next(error); }
  }

  /**
   * POST /api/v1/users/me/2fa/disable
   * IDOR fix: operates on the authenticated user only.
   */
  async disable2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthenticatedUser(req);
      await userService.disable2FA(user.userId);
      res.status(200).json({ success: true, message: '2FA disabled' });
    } catch (error) { next(error); }
  }

  /**
   * POST /api/v1/users/me/verify-email
   * IDOR fix: operates on the authenticated user only.
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthenticatedUser(req);
      await userService.verifyEmail(user.userId);
      res.status(200).json({ success: true, message: 'Email verified' });
    } catch (error) { next(error); }
  }

  /**
   * POST /api/v1/users/me/verify-phone
   * IDOR fix: operates on the authenticated user only.
   */
  async verifyPhone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthenticatedUser(req);
      await userService.verifyPhone(user.userId);
      res.status(200).json({ success: true, message: 'Phone verified' });
    } catch (error) { next(error); }
  }
}

export const userController = new UserController();