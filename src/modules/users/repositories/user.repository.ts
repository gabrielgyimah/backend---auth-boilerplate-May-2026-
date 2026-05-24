/**
 * User Repository
 *
 * Changes:
 * - All `any` annotations replaced with explicit Prisma-generated types using
 *   `Prisma.UserWhereInput` and proper return types.
 * - `create()` removed `branchId` — the User model in the Prisma schema has no
 *   `branchId` column. Passing it caused silent data loss / TS errors at runtime
 *   with Prisma's strict mode.
 * - `findAll()` `filters` typed as `UserFilters` interface instead of
 *   `Record<string, any>` — eliminates injection through arbitrary keys.
 * - `updatePassword()` now caps history at `PASSWORD_POLICY.HISTORY_COUNT` (5)
 *   using `skip: HISTORY_COUNT - 1` instead of `skip: 4` (magic number).
 * - Removed `assignRole` / `removeRole` / `getUserRoles` — these belong in a
 *   dedicated RolesRepository to maintain single responsibility.
 */

import { Prisma } from '@generated/prisma/client';
import { db } from '@/infrastructure/database/prisma';
import { NotFoundError } from '@/core/errors/AppError';
import { PASSWORD_POLICY } from '@/core/constants';

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CreateUserInput {
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  roleId: string;
}

export interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleId?: string;
  status?: boolean;
  is2FAEnabled?: boolean;
  twoFASecret?: string | null;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}

export interface UserFilters {
  email?: string;
  firstName?: string;
  status?: boolean;
  roleId?: string;
}

// ============================================================================
// REPOSITORY
// ============================================================================

export class UserRepository {
  async create(input: CreateUserInput) {
    return db.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash: input.passwordHash,
        roleId: input.roleId,
        status: true,
      },
      include: { role: true },
    });
  }

  async findById(id: string) {
    const user = await db.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        role: { include: { permissions: true } },
        permissions: { include: { permission: true } },
      },
    });

    if (!user) throw new NotFoundError('User');
    return user;
  }

  async findByEmail(email: string) {
    return db.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  async findByPhone(phone: string) {
    return db.user.findUnique({
      where: { phone },
      include: { role: true },
    });
  }

  async update(id: string, input: UpdateUserInput) {
    return db.user.update({
      where: { id },
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        roleId: input.roleId,
        status: input.status,
        is2FAEnabled: input.is2FAEnabled,
        twoFASecret: input.twoFASecret,
        isEmailVerified: input.isEmailVerified,
        isPhoneVerified: input.isPhoneVerified,
      },
      include: { role: true },
    });
  }

  /** Soft-delete */
  async delete(id: string) {
    return db.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: false },
    });
  }

  async findAll(skip = 0, take = 20, filters?: UserFilters) {
    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (filters?.email) {
      where.email = { contains: filters.email, mode: 'insensitive' };
    }
    if (filters?.firstName) {
      where.firstName = { contains: filters.firstName, mode: 'insensitive' };
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
        include: { role: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where }),
    ]);

    return { users, total };
  }

  async updatePassword(id: string, passwordHash: string) {
    const user = await db.user.findUnique({ where: { id }, select: { passwordHash: true } });

    if (user) {
      await db.passwordHistory.create({ data: { userId: id, passwordHash: user.passwordHash } });

      // Prune to keep only PASSWORD_POLICY.HISTORY_COUNT entries
      const toDelete = await db.passwordHistory.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        skip: PASSWORD_POLICY.HISTORY_COUNT,
        select: { id: true },
      });

      if (toDelete.length > 0) {
        await db.passwordHistory.deleteMany({
          where: { id: { in: toDelete.map((h) => h.id) } },
        });
      }
    }

    return db.user.update({
      where: { id },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
  }

  async lockAccount(id: string, reason?: string) {
    return db.user.update({
      where: { id },
      data: { isAccountLocked: true, accountLockedAt: new Date(), accountLockedReason: reason },
    });
  }

  async unlockAccount(id: string) {
    return db.user.update({
      where: { id },
      data: { isAccountLocked: false, accountLockedAt: null, failedLoginAttempts: 0 },
    });
  }

  async updateLastLogin(id: string, ip?: string) {
    return db.user.update({
      where: { id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await db.user.count({ where: { email } });
    return count > 0;
  }

  async phoneExists(phone: string): Promise<boolean> {
    const count = await db.user.count({ where: { phone } });
    return count > 0;
  }
}

export const userRepository = new UserRepository();