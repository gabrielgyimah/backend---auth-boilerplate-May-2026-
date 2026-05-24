/**
 * User Service
 * Contains business logic for user management
 * Uses UserRepository for data access
 */

import { userRepository, CreateUserInput, UpdateUserInput } from '@modules/users/repositories/user.repository';
import { hashPassword, verifyPassword } from '@/core/utils';
import { ConflictError, ValidationError } from '@/core/errors/AppError';
import { PASSWORD_POLICY } from '@/core/constants';

export class UserService {
  /**
   * Create a new user
   */
  async createUser(
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    roleId: string,
    branchId?: string
  ) {
    // Validate email uniqueness
    if (await userRepository.emailExists(email)) {
      throw new ConflictError('Email already registered');
    }

    // Validate password
    this.validatePassword(password);

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const createInput: CreateUserInput = {
      email,
      firstName,
      lastName,
      passwordHash,
      roleId,
      branchId,
    };

    const user = await userRepository.create(createInput);

    return {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.name,
    };
  }

  /**
   * Update user
   */
  async updateUser(userId: string, input: Partial<UpdateUserInput>) {
    const user = await userRepository.update(userId, input);
    return user;
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string) {
    return await userRepository.delete(userId);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    return await userRepository.findById(userId);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    return await userRepository.findByEmail(email);
  }

  /**
   * Get all users
   */
  async getAllUsers(page: number = 1, limit: number = 20, filters?: Record<string, any>) {
    const skip = (page - 1) * limit;
    const { users, total }: Awaited<ReturnType<typeof userRepository.findAll>> = 
      await userRepository.findAll(skip, limit, filters);

    return {
      users: users.map((user: { id: any; email: any; firstName: any; lastName: any; role: { name: any; }; status: any; createdAt: any; }) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        status: user.status,
        createdAt: user.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await userRepository.findById(userId);

    // Verify current password
    const isPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new ValidationError('Current password is incorrect');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await userRepository.updatePassword(userId, passwordHash);

    return {
      message: 'Password changed successfully',
    };
  }

  /**
   * Lock user account
   */
  async lockAccount(userId: string, reason?: string) {
    return await userRepository.lockAccount(userId, reason);
  }

  /**
   * Unlock user account
   */
  async unlockAccount(userId: string) {
    return await userRepository.unlockAccount(userId);
  }

  /**
   * Enable 2FA for user
   */
  async enable2FA(userId: string, secret: string) {
    return await userRepository.update(userId, {
      is2FAEnabled: true,
      twoFASecret: secret,
    });
  }

  /**
   * Disable 2FA for user
   */
  async disable2FA(userId: string) {
    return await userRepository.update(userId, {
      is2FAEnabled: false,
      twoFASecret: undefined,
    });
  }

  /**
   * Verify email
   */
  async verifyEmail(userId: string) {
    return await userRepository.update(userId, {
      isEmailVerified: true,
    });
  }

  /**
   * Verify phone
   */
  async verifyPhone(userId: string) {
    return await userRepository.update(userId, {
      isPhoneVerified: true,
    });
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Validate password against policy
   */
  private validatePassword(password: string): void {
    if (password.length < PASSWORD_POLICY.MIN_LENGTH) {
      throw new ValidationError(
        `Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters long`
      );
    }

    if (password.length > PASSWORD_POLICY.MAX_LENGTH) {
      throw new ValidationError(
        `Password must not exceed ${PASSWORD_POLICY.MAX_LENGTH} characters`
      );
    }

    if (PASSWORD_POLICY.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      throw new ValidationError('Password must contain at least one uppercase letter');
    }

    if (PASSWORD_POLICY.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      throw new ValidationError('Password must contain at least one lowercase letter');
    }

    if (PASSWORD_POLICY.REQUIRE_NUMBERS && !/\d/.test(password)) {
      throw new ValidationError('Password must contain at least one number');
    }

    if (PASSWORD_POLICY.REQUIRE_SPECIAL_CHARS) {
      const specialCharRegex = new RegExp(
        `[${PASSWORD_POLICY.SPECIAL_CHARS.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`
      );
      if (!specialCharRegex.test(password)) {
        throw new ValidationError(
          `Password must contain at least one special character: ${PASSWORD_POLICY.SPECIAL_CHARS}`
        );
      }
    }
  }

  /**
   * Check if password meets policy requirements
   */
  isPasswordStrong(password: string): boolean {
    try {
      this.validatePassword(password);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const userService = new UserService();
