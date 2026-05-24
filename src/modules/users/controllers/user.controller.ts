/**
 * User Controller
 * Handles HTTP requests for user management
 * Uses UserService for business logic
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { userService } from '../services/user.service';
import { ValidationError } from '@/core/errors/AppError';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  firstName: z.string().min(2, 'First name required'),
  lastName: z.string().min(2, 'Last name required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase')
    .regex(/[a-z]/, 'Password must contain lowercase')
    .regex(/\d/, 'Password must contain number')
    .regex(/[!@#$%^&*]/, 'Password must contain special character'),
  roleId: z.string().uuid('Invalid role ID'),
  branchId: z.string().uuid('Invalid branch ID').optional(),
});

const updateUserSchema = z.object({
  email: z.string().email('Invalid email').optional(),
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().optional(),
  roleId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  status: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase')
    .regex(/[a-z]/, 'Password must contain lowercase')
    .regex(/\d/, 'Password must contain number')
    .regex(/[!@#$%^&*]/, 'Password must contain special character'),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// CONTROLLER CLASS
// ============================================================================

export class UserController {
  /**
   * Create a new user
   * POST /api/v1/users
   */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = createUserSchema.parse(req.body);

      const user = await userService.createUser(
        validatedData.email,
        validatedData.firstName,
        validatedData.lastName,
        validatedData.password,
        validatedData.roleId,
        validatedData.branchId
      );

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(
          new ValidationError('Validation failed', {
            errors: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          })
        );
      } else {
        next(error);
      }
    }
  }

  /**
   * Get user by ID
   * GET /api/v1/users/:id
   */
  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);

      res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all users with pagination
   * GET /api/v1/users
   */
  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = paginationSchema.parse(req.query);

      const filters = {
        email: req.query.email as string,
        firstName: req.query.firstName as string,
        status: req.query.status === 'true',
        roleId: req.query.roleId as string,
      };

      const result = await userService.getAllUsers(page, limit, filters);

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
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
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ValidationError('Invalid pagination parameters'));
      } else {
        next(error);
      }
    }
  }

  /**
   * Update user
   * PUT /api/v1/users/:id
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = updateUserSchema.parse(req.body);

      const user = await userService.updateUser(id, validatedData);

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ValidationError('Validation failed'));
      } else {
        next(error);
      }
    }
  }

  /**
   * Delete user
   * DELETE /api/v1/users/:id
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await userService.deleteUser(id);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   * POST /api/v1/users/:id/change-password
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = changePasswordSchema.parse(req.body);

      await userService.changePassword(id, validatedData.currentPassword, validatedData.newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ValidationError('Validation failed'));
      } else {
        next(error);
      }
    }
  }

  /**
   * Lock user account
   * POST /api/v1/users/:id/lock
   */
  async lockAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      await userService.lockAccount(id, reason);

      res.status(200).json({
        success: true,
        message: 'User account locked successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unlock user account
   * POST /api/v1/users/:id/unlock
   */
  async unlockAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await userService.unlockAccount(id);

      res.status(200).json({
        success: true,
        message: 'User account unlocked successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enable 2FA
   * POST /api/v1/users/:id/2fa/enable
   */
  async enable2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { secret } = req.body;

      if (!secret) {
        throw new ValidationError('2FA secret required');
      }

      await userService.enable2FA(id, secret);

      res.status(200).json({
        success: true,
        message: '2FA enabled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable 2FA
   * POST /api/v1/users/:id/2fa/disable
   */
  async disable2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await userService.disable2FA(id);

      res.status(200).json({
        success: true,
        message: '2FA disabled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email
   * POST /api/v1/users/:id/verify-email
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await userService.verifyEmail(id);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify phone
   * POST /api/v1/users/:id/verify-phone
   */
  async verifyPhone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await userService.verifyPhone(id);

      res.status(200).json({
        success: true,
        message: 'Phone verified successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
