/**
 * User Repository
 * Handles all database operations for users
 * Implements Repository Pattern
 */

// Import UserWhereInput directly alongside any other top-level types you need
import { db } from '@/infrastructure/database/prisma';
import { NotFoundError } from '@/core/errors/AppError';

export interface CreateUserInput {
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  roleId: string;
  branchId?: string;
}

export interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleId?: string;
  branchId?: string;
  status?: boolean;
  is2FAEnabled?: boolean;
  twoFASecret?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}

export class UserRepository {
  /**
   * Create a new user
   */
  async create(input: CreateUserInput) {
    return await db.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash: input.passwordHash,
        roleId: input.roleId,
        branchId: input.branchId,
        status: true,
      },
      include: {
        role: true,
      },
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string) {
    const user = await db.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string) {
    return await db.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    });
  }

  /**
   * Find user by phone
   */
  async findByPhone(phone: string) {
    return await db.user.findUnique({
      where: { phone },
      include: {
        role: true,
      },
    });
  }

  /**
   * Update user
   */
  async update(id: string, input: UpdateUserInput) {
    return await db.user.update({
      where: { id },
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        roleId: input.roleId,
        branchId: input.branchId,
        status: input.status,
        is2FAEnabled: input.is2FAEnabled,
        twoFASecret: input.twoFASecret,
        isEmailVerified: input.isEmailVerified,
        isPhoneVerified: input.isPhoneVerified,
        updatedAt: new Date(),
      },
      include: {
        role: true,
      },
    });
  }

  /**
   * Delete user (soft delete)
   */
  async delete(id: string) {
    return await db.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: false,
      },
    });
  }

  /**
   * Get all users with pagination
   */
  async findAll(skip: number = 0, take: number = 20, filters?: Record<string, any>) {
    const where: any = {
      deletedAt: null,
    };

    if (filters?.email) {
      where.email = {
        contains: filters.email,
        mode: 'insensitive',
      };
    }

    if (filters?.firstName) {
      where.firstName = {
        contains: filters.firstName,
        mode: 'insensitive',
      };
    }

    if (filters?.status !== undefined) {
      where.status = filters.status;
    }

    if (filters?.roleId) {
      where.roleId = filters.roleId;
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take,
        include: {
          role: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      db.user.count({ where }),
    ]);

    return { users, total };
  }

  /**
   * Update password hash
   */
  async updatePassword(id: string, passwordHash: string) {
    // Store old password in history
    const user = await db.user.findUnique({
      where: { id },
    });

    if (user) {
      await db.passwordHistory.create({
        data: {
          userId: id,
          passwordHash: user.passwordHash,
        },
      });

      // Keep only last 5 passwords
      const history = await db.passwordHistory.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        skip: 4,
      });

      if (history.length > 0) {
        await db.passwordHistory.deleteMany({
          where: {
            id: {
              in: history.map((h: any) => h.id),
            },
          },
        });
      }
    }

    return await db.user.update({
      where: { id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });
  }

  /**
   * Lock account
   */
  async lockAccount(id: string, reason?: string) {
    return await db.user.update({
      where: { id },
      data: {
        isAccountLocked: true,
        accountLockedAt: new Date(),
        accountLockedReason: reason,
      },
    });
  }

  /**
   * Unlock account
   */
  async unlockAccount(id: string) {
    return await db.user.update({
      where: { id },
      data: {
        isAccountLocked: false,
        accountLockedAt: null,
        failedLoginAttempts: 0,
      },
    });
  }

  /**
   * Increment failed login attempts
   */
  async incrementFailedLoginAttempts(id: string) {
    return await db.user.update({
      where: { id },
      data: {
        failedLoginAttempts: {
          increment: 1,
        },
        lastFailedLoginAt: new Date(),
      },
    });
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedLoginAttempts(id: string) {
    return await db.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
      },
    });
  }

  /**
   * Update last login
   */
  async updateLastLogin(id: string, ip?: string) {
    return await db.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { email },
    });
    return !!user;
  }

  /**
   * Check if phone exists
   */
  async phoneExists(phone: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { phone },
    });
    return !!user;
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string) {
    return await db.userRole.create({
      data: {
        userId,
        roleId,
      },
    });
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string) {
    return await db.userRole.deleteMany({
      where: {
        userId,
        roleId,
      },
    });
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string) {
    return await db.userRole.findMany({
      where: { userId },
      include: {
        role: true,
      },
    });
  }
}

export const userRepository = new UserRepository();
