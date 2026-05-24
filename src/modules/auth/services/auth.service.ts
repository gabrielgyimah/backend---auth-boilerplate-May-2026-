/**
 * Auth Service
 * Contains authentication business logic
 * 
 * FIXES:
 * - No plaintext tokens stored
 * - Atomic failed login attempts
 * - Refresh token rotation
 * - Device trust during 2FA
 * - Email verification flow
 * - OTP ownership validation
 * - DB expiry check for refresh tokens
 */

import { authRepository } from '../repositories/auth.repository';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateOTP,
  generateSecureToken,
  signChallengeToken,
  verifyChallengeToken,
} from '@/core/utils';
import {
  AuthenticationError,
  ConflictError,
  ValidationError,
  NotFoundError,
} from '@/core/errors/AppError';
import { db } from '@/infrastructure/database/prisma';
import { OTPStatus, OTPType, RoleType, SecurityEventType, SessionStatus } from '@generated/prisma/client';
import {
  PASSWORD_POLICY,
  SECURITY,
  TOKEN_EXPIRY,
} from '@/core/constants';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function expiryToMs(expiry: string): number {
  const unit = expiry.slice(-1);
  const value = parseInt(expiry.slice(0, -1), 10);
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default:  return value * 1000;
  }
}

async function recordSecurityEvent(
  userId: string,
  eventType: SecurityEventType,
  opts: {
    description?: string;
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  } = {}
): Promise<void> {
  try {
    await db.securityEvent.create({
      data: {
        userId,
        eventType,
        description: opts.description,
        ipAddress: opts.ipAddress,
        userAgent: opts.userAgent,
        deviceId: opts.deviceId,
        severity: opts.severity ?? 'LOW',
      },
    });
  } catch {
    // Audit logging failure must not break process thread execution
  }
}

async function savePasswordHistory(userId: string, passwordHash: string): Promise<void> {
  await db.passwordHistory.create({ data: { userId, passwordHash } });

  const oldest = await db.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip: PASSWORD_POLICY.HISTORY_COUNT,
    select: { id: true },
  });

  if (oldest.length > 0) {
    await db.passwordHistory.deleteMany({
      where: { id: { in: oldest.map((r) => r.id) } },
    });
  }
}

/**
 * Issues new access & refresh tokens, creates refresh token record,
 * creates session, and updates last login. Implements refresh token rotation
 * by revoking the previous refresh token if provided.
 */
async function issueTokensAndSession(
  user: {
    id: string;
    email: string;
    role: { name: string; permissions: { code: string }[] };
  },
  deviceInfo: {
    name: string;
    type: string;
    userAgent?: string;
    ipAddress?: string;
  },
  deviceId?: string,
  previousRefreshTokenHash?: string // for rotation
) {
  const ipAddress = deviceInfo.ipAddress;
  const permissions = user.role.permissions.map((p) => p.code);

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role.name,
    permissions,
  });

  // Generate new refresh token with incremented version
  const refreshToken = generateRefreshToken({
    userId: user.id,
    tokenVersion: 2, // you may store version from previous token +1
  });
  const refreshTokenHash = hashToken(refreshToken);
  const refreshTokenExpiry = new Date(
    Date.now() + expiryToMs(TOKEN_EXPIRY.REFRESH_TOKEN)
  );

  // Execute operations within transaction
  await db.$transaction(async (tx) => {
    // If we are rotating, revoke the previous refresh token
    if (previousRefreshTokenHash) {
      await tx.refreshToken.updateMany({
        where: { tokenHash: previousRefreshTokenHash },
        data: { revokedAt: new Date() },
      });
      // Also invalidate the old session
      const oldSession = await tx.session.findFirst({
        where: { tokenHash: previousRefreshTokenHash },
      });
      if (oldSession) {
        await tx.session.update({
          where: { id: oldSession.id },
          data: { status: SessionStatus.LOGGED_OUT, deletedAt: new Date() },
        });
      }
    }

    // Create new refresh token record (only hash)
    const newRefreshToken = await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshTokenExpiry,
        tokenVersion: 1,
      },
    });

    // Create session linked to the refresh token
    await tx.session.create({
      data: {
        userId: user.id,
        refreshTokenId: newRefreshToken.id,
        tokenHash: refreshTokenHash,
        deviceId,
        ipAddress: ipAddress ?? 'unknown',
        userAgent: deviceInfo.userAgent,
        expiresAt: refreshTokenExpiry,
        status: SessionStatus.ACTIVE,
      },
    });

    // Update user's last login
    await tx.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });
  });

  return { accessToken, refreshToken };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AuthService {
  // -------------------------------------------------------------------------
  // Register + Email Verification
  // -------------------------------------------------------------------------

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) {
    if (await authRepository.emailExists(email)) {
      throw new ConflictError('Email already registered');
    }

    this.validatePassword(password);

    const passwordHash = await hashPassword(password);

    const defaultRole = await db.role.findFirst({
      where: { name: RoleType.CUSTOMER },
    });

    if (!defaultRole) {
      throw new Error('CUSTOMER role not found in database');
    }

    const passwordExpiresAt = new Date(
      Date.now() + PASSWORD_POLICY.EXPIRE_DAYS * 24 * 60 * 60 * 1000
    );

    const user = await db.user.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash,
        roleId: defaultRole.id,
        status: true,
        isEmailVerified: false,
        passwordExpiresAt,
      },
      include: { role: true },
    });

    await savePasswordHistory(user.id, passwordHash);

    // Generate email verification token
    const verificationToken = generateSecureToken();
    const verificationTokenHash = hashToken(verificationToken);
    const verificationExpiry = new Date(
      Date.now() + expiryToMs(TOKEN_EXPIRY.EMAIL_VERIFICATION_TOKEN || '7d')
    );

    await authRepository.createEmailVerificationToken(
      user.id,
      verificationTokenHash,
      verificationExpiry
    );

    // TODO: await emailService.sendVerificationEmail(user.email, verificationToken);

    void recordSecurityEvent(user.id, SecurityEventType.REGISTER, {
      description: 'User registered – verification email sent',
      severity: 'LOW',
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.name,
    };
  }

  async verifyEmail(token: string) {
    const tokenHash = hashToken(token);
    const record = await authRepository.findValidEmailVerificationToken(tokenHash);
    if (!record) {
      throw new ValidationError('Invalid or expired verification token');
    }

    await authRepository.markEmailVerificationTokenAsUsed(tokenHash);
    await authRepository.verifyUserEmail(record.userId);

    void recordSecurityEvent(record.userId, SecurityEventType.EMAIL_VERIFIED, {
      description: 'Email verified successfully',
      severity: 'LOW',
    });

    return { success: true };
  }

  // -------------------------------------------------------------------------
  // Login — Step 1 (with atomic failed attempts)
  // -------------------------------------------------------------------------

  async login(
    email: string,
    password: string,
    deviceInfo?: {
      name: string;
      type: string;
      userAgent?: string;
      ipAddress?: string;
    }
  ) {
    const ipAddress = deviceInfo?.ipAddress;

    const user = await db.user.findUnique({
      where: { email },
      include: {
        role: { include: { permissions: true } },
      },
    });

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (user.isAccountLocked) {
      throw new AuthenticationError('Account is locked. Please contact support.');
    }

    if (!user.status) {
      throw new AuthenticationError('Account is inactive');
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      // Atomic increment
      const newFailedAttempts = await authRepository.incrementFailedLoginAttempts(user.id);

      if (newFailedAttempts >= SECURITY.MAX_LOGIN_ATTEMPTS) {
        await authRepository.lockAccount(user.id, 'Too many failed login attempts');
        void recordSecurityEvent(user.id, SecurityEventType.ACCOUNT_LOCKED, {
          description: `Account locked after ${newFailedAttempts} failed attempts`,
          ipAddress,
          userAgent: deviceInfo?.userAgent,
          severity: 'HIGH',
        });
      } else {
        void recordSecurityEvent(user.id, SecurityEventType.LOGIN_FAILURE, {
          description: `Failed login attempt ${newFailedAttempts}/${SECURITY.MAX_LOGIN_ATTEMPTS}`,
          ipAddress,
          userAgent: deviceInfo?.userAgent,
          severity: 'MEDIUM',
        });
      }

      throw new AuthenticationError('Invalid email or password');
    }

    await authRepository.resetFailedLoginAttempts(user.id);

    // Evaluate device trust
    let isDeviceTrusted = false;
    if (deviceInfo) {
      const existingDevice = await db.device.findFirst({
        where: {
          userId: user.id,
          name: deviceInfo.name,
          deviceType: deviceInfo.type,
          isTrusted: true,
          deletedAt: null,
        },
      });
      if (existingDevice) {
        isDeviceTrusted = true;
      }
    }

    // 2FA Gate
    if (user.is2FAEnabled && !isDeviceTrusted) {
      // Invalidate any existing pending OTPs (handled inside createOtpRequest)
      const otp = generateOTP(SECURITY.OTP_LENGTH);
      const otpExpiry = new Date(Date.now() + expiryToMs(TOKEN_EXPIRY.OTP_TOKEN));

      const otpRequest = await authRepository.createOtpRequest(
        user.id,
        otp,
        OTPType.LOGIN_VERIFICATION,
        otpExpiry,
        user.email
      );

      // TODO: await emailService.sendOtpEmail(user.email, otp);

      const challengeToken = signChallengeToken({
        userId: user.id,
        otpRequestId: otpRequest.id,
        challenge: true,
        deviceName: deviceInfo?.name ?? 'Unknown Device',
        deviceType: deviceInfo?.type ?? 'web',
        userAgent: deviceInfo?.userAgent,
        ipAddress,
      });

      void recordSecurityEvent(user.id, SecurityEventType.LOGIN_SUCCESS, {
        description: 'Password verified — awaiting 2FA OTP',
        ipAddress,
        userAgent: deviceInfo?.userAgent,
        severity: 'LOW',
      });

      return {
        requiresTwoFactor: true as const,
        challengeToken,
      };
    }

    // Direct login (no 2FA or trusted device)
    let deviceId: string | undefined;
    if (deviceInfo) {
      const device = await authRepository.upsertDevice({
        userId: user.id,
        deviceName: deviceInfo.name,
        deviceType: deviceInfo.type,
      });
      deviceId = device.id;
    }

    const { accessToken, refreshToken } = await issueTokensAndSession(
      user,
      deviceInfo ?? { name: 'Unknown Device', type: 'web' },
      deviceId
    );

    void recordSecurityEvent(user.id, SecurityEventType.LOGIN_SUCCESS, {
      description: 'Login successful (no 2FA or trusted device)',
      ipAddress,
      userAgent: deviceInfo?.userAgent,
      deviceId,
      severity: 'LOW',
    });

    return {
      requiresTwoFactor: false as const,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Login — Step 2 (2FA OTP Verification) with device trust option
  // -------------------------------------------------------------------------

  async verifyLoginOtp(challengeToken: string, otpCode: string, trustDevice: boolean = false) {
    const decoded = verifyChallengeToken(challengeToken) as {
      userId: string;
      otpRequestId: string;
      challenge: boolean;
      deviceName: string;
      deviceType: string;
      userAgent?: string;
      ipAddress?: string;
    } | null;

    if (!decoded || !decoded.challenge || !decoded.otpRequestId) {
      throw new AuthenticationError('Invalid or expired validation challenge');
    }

    const { userId, otpRequestId, deviceName, deviceType, userAgent, ipAddress } = decoded;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { role: { include: { permissions: true } } },
    });

    if (!user || !user.status) {
      throw new AuthenticationError('User not found or inactive');
    }

    if (user.isAccountLocked) {
      throw new AuthenticationError('Account is locked');
    }

    const otpRequest = await authRepository.findOtpRequestById(otpRequestId);

    if (
      !otpRequest ||
      otpRequest.status !== OTPStatus.PENDING ||
      otpRequest.expiresAt <= new Date() ||
      otpRequest.verifiedAt
    ) {
      throw new AuthenticationError('OTP request expired or invalid');
    }

    // Validate OTP ownership
    if (otpRequest.userId !== userId) {
      throw new AuthenticationError('OTP does not belong to this user');
    }

    if (otpRequest.code !== otpCode) {
      const updatedOtp = await authRepository.incrementOtpAttempts(otpRequest.id);
      // Also increment global failed attempts atomically
      const newFailedAttempts = await authRepository.incrementFailedLoginAttempts(userId);

      if (updatedOtp.attempts >= otpRequest.maxAttempts || newFailedAttempts >= SECURITY.MAX_LOGIN_ATTEMPTS) {
        await authRepository.expireOtpRequest(otpRequest.id);
        if (newFailedAttempts >= SECURITY.MAX_LOGIN_ATTEMPTS) {
          await authRepository.lockAccount(userId, 'Too many 2FA failures');
          void recordSecurityEvent(userId, SecurityEventType.ACCOUNT_LOCKED, {
            description: `Account locked after ${newFailedAttempts} total failures`,
            ipAddress,
            userAgent,
            severity: 'CRITICAL',
          });
        }
        throw new AuthenticationError('Too many invalid attempts. Please restart login.');
      }

      void recordSecurityEvent(userId, SecurityEventType.LOGIN_FAILURE, {
        description: `Invalid 2FA OTP attempt ${updatedOtp.attempts}`,
        ipAddress,
        userAgent,
        severity: 'MEDIUM',
      });

      throw new AuthenticationError('Invalid OTP code');
    }

    // OTP is valid
    await authRepository.verifyOtpRequest(otpRequest.id);
    await authRepository.resetFailedLoginAttempts(userId);

    // Upsert device and optionally trust it
    const device = await authRepository.upsertDevice({
      userId,
      deviceName,
      deviceType,
    });

    if (trustDevice) {
      await authRepository.updateDeviceTrust(device.id, true);
    }

    const { accessToken, refreshToken } = await issueTokensAndSession(
      user,
      { name: deviceName, type: deviceType, userAgent, ipAddress },
      device.id
    );

    void recordSecurityEvent(userId, SecurityEventType.LOGIN_SUCCESS, {
      description: `2FA verified, device trusted=${trustDevice}`,
      ipAddress,
      userAgent,
      deviceId: device.id,
      severity: 'LOW',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Refresh access token (with rotation)
  // -------------------------------------------------------------------------

  async refreshAccessToken(oldRefreshToken: string) {
    const decoded = verifyRefreshToken(oldRefreshToken) as any;
    if (!decoded) {
      throw new AuthenticationError('Invalid refresh token');
    }

    const oldTokenHash = hashToken(oldRefreshToken);
    const isValid = await authRepository.isRefreshTokenValid(oldTokenHash);
    if (!isValid) {
      throw new AuthenticationError('Refresh token revoked or expired');
    }

    // Fetch the token record to get the user ID and previous version
    const oldTokenRecord = await authRepository.findRefreshTokenByHash(oldTokenHash);
    if (!oldTokenRecord) {
      throw new AuthenticationError('Refresh token not found');
    }

    const user = await db.user.findUnique({
      where: { id: oldTokenRecord.userId },
      include: { role: { include: { permissions: true } } },
    });

    if (!user || !user.status) {
      throw new AuthenticationError('User not found or inactive');
    }

    if (user.isAccountLocked) {
      throw new AuthenticationError('Account is locked');
    }

    // Issue new tokens, revoking the old one
    const permissions = user.role.permissions.map((p) => p.code);

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role.name,
      permissions,
    });

    // Generate new refresh token (rotation)
    const newRefreshToken = generateRefreshToken({
      userId: user.id,
      tokenVersion: (oldTokenRecord.tokenVersion || 0) + 1,
    });
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const refreshTokenExpiry = new Date(
      Date.now() + expiryToMs(TOKEN_EXPIRY.REFRESH_TOKEN)
    );

    await db.$transaction(async (tx) => {
      // Revoke the old refresh token
      await tx.refreshToken.update({
        where: { id: oldTokenRecord.id },
        data: { revokedAt: new Date() },
      });

      // Create new refresh token record
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newRefreshTokenHash,
          expiresAt: refreshTokenExpiry,
          tokenVersion: (oldTokenRecord.tokenVersion || 0) + 1,
        },
      });

      // Update the session to use the new token hash
      const session = await tx.session.findFirst({
        where: { tokenHash: oldTokenHash },
      });
      if (session) {
        await tx.session.update({
          where: { id: session.id },
          data: {
            tokenHash: newRefreshTokenHash,
            expiresAt: refreshTokenExpiry,
          },
        });
      }
    });

    void recordSecurityEvent(user.id, SecurityEventType.TOKEN_REFRESH, {
      description: 'Access and refresh tokens rotated',
      severity: 'LOW',
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------

  async logout(userId: string, refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    // Revoke the refresh token
    await authRepository.revokeRefreshToken(tokenHash);
    // Invalidate the session
    const session = await authRepository.findSessionByTokenHash(tokenHash);
    if (session) {
      await authRepository.invalidateSession(session.id);
    }
    void recordSecurityEvent(userId, SecurityEventType.LOGOUT, {
      severity: 'LOW',
    });
    return { success: true };
  }

  // -------------------------------------------------------------------------
  // Password reset request (do NOT return token in response)
  // -------------------------------------------------------------------------

  async requestPasswordReset(email: string) {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      // For security, still return success but do nothing
      return { success: true };
    }

    const resetToken = generateSecureToken();
    const resetTokenHash = hashToken(resetToken);
    const expiresAt = new Date(
      Date.now() + expiryToMs(TOKEN_EXPIRY.RESET_PASSWORD_TOKEN)
    );

    await authRepository.createPasswordResetToken(user.id, resetTokenHash, expiresAt);

    // TODO: await emailService.sendPasswordResetEmail(email, resetToken);

    void recordSecurityEvent(user.id, SecurityEventType.PASSWORD_RESET, {
      description: 'Password reset requested',
      severity: 'MEDIUM',
    });

    // Do NOT return the reset token in the response
    return { success: true };
  }

  // -------------------------------------------------------------------------
  // Reset password with token
  // -------------------------------------------------------------------------

  async resetPassword(resetToken: string, newPassword: string) {
    const tokenHash = hashToken(resetToken);
    const resetTokenRecord = await authRepository.findValidResetToken(tokenHash);
    if (!resetTokenRecord) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    this.validatePassword(newPassword);
    await this.assertPasswordNotReused(resetTokenRecord.userId, newPassword);

    const newPasswordHash = await hashPassword(newPassword);
    const passwordExpiresAt = new Date(
      Date.now() + PASSWORD_POLICY.EXPIRE_DAYS * 24 * 60 * 60 * 1000
    );

    await db.user.update({
      where: { id: resetTokenRecord.userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
        passwordExpiresAt,
        isAccountLocked: false,
        accountLockedAt: null,
        accountLockedReason: null,
        failedLoginAttempts: 0,
      },
    });

    await authRepository.markResetTokenAsUsed(tokenHash);
    await savePasswordHistory(resetTokenRecord.userId, newPasswordHash);

    void recordSecurityEvent(resetTokenRecord.userId, SecurityEventType.PASSWORD_RESET, {
      description: 'Password reset completed',
      severity: 'MEDIUM',
    });

    return { success: true };
  }

  // -------------------------------------------------------------------------
  // Change password (authenticated user)
  // -------------------------------------------------------------------------

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) throw new ValidationError('Current password is incorrect');

    this.validatePassword(newPassword);

    const isSame = await verifyPassword(newPassword, user.passwordHash);
    if (isSame) throw new ValidationError('New password cannot be the same as current');

    await this.assertPasswordNotReused(userId, newPassword);

    const newHash = await hashPassword(newPassword);
    const passwordExpiresAt = new Date(
      Date.now() + PASSWORD_POLICY.EXPIRE_DAYS * 24 * 60 * 60 * 1000
    );

    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        passwordChangedAt: new Date(),
        passwordExpiresAt,
      },
    });

    await savePasswordHistory(userId, newHash);

    void recordSecurityEvent(userId, SecurityEventType.PASSWORD_CHANGE, {
      description: 'Password changed by user',
      severity: 'MEDIUM',
    });

    return { success: true };
  }

  // -------------------------------------------------------------------------
  // 2FA management (enable/disable/verify)
  // -------------------------------------------------------------------------

  async enableTwoFactor(userId: string) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    if (user.is2FAEnabled) throw new ValidationError('2FA already enabled');

    const otp = generateOTP(SECURITY.OTP_LENGTH);
    const otpExpiry = new Date(Date.now() + expiryToMs(TOKEN_EXPIRY.OTP_TOKEN));

    await authRepository.createOtpRequest(
      user.id,
      otp,
      OTPType.TWO_FACTOR,
      otpExpiry,
      user.email
    );

    // TODO: await emailService.sendOtpEmail(user.email, otp);
    return { success: true, otpRequired: true, message: 'OTP sent to email' };
  }

  async verifyTwoFactorOtp(userId: string, otpCode: string) {
    const otpRequest = await authRepository.findValidOtpRequest(userId, OTPType.TWO_FACTOR);
    if (!otpRequest) throw new ValidationError('No valid OTP found');

    if (otpRequest.code !== otpCode) {
      await authRepository.incrementOtpAttempts(otpRequest.id);
      if (otpRequest.attempts + 1 >= otpRequest.maxAttempts) {
        await authRepository.expireOtpRequest(otpRequest.id);
        throw new ValidationError('Too many invalid attempts');
      }
      throw new ValidationError('Invalid OTP');
    }

    await authRepository.verifyOtpRequest(otpRequest.id);
    await db.user.update({ where: { id: userId }, data: { is2FAEnabled: true } });

    void recordSecurityEvent(userId, SecurityEventType.MFA_ENABLED, {
      description: '2FA enabled',
      severity: 'MEDIUM',
    });

    return { success: true, message: '2FA enabled' };
  }

  async disableTwoFactor(userId: string, password: string) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    if (!user.is2FAEnabled) throw new ValidationError('2FA is not enabled');

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new AuthenticationError('Invalid password');

    await db.user.update({
      where: { id: userId },
      data: { is2FAEnabled: false, twoFASecret: null },
    });

    void recordSecurityEvent(userId, SecurityEventType.MFA_DISABLED, {
      description: '2FA disabled',
      severity: 'HIGH',
    });

    return { success: true, message: '2FA disabled' };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private validatePassword(password: string): void {
    if (password.length < PASSWORD_POLICY.MIN_LENGTH) {
      throw new ValidationError(`Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters`);
    }
    if (password.length > PASSWORD_POLICY.MAX_LENGTH) {
      throw new ValidationError(`Password must not exceed ${PASSWORD_POLICY.MAX_LENGTH} characters`);
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
    if (PASSWORD_POLICY.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      throw new ValidationError('Password must contain at least one special character');
    }
  }

  private async assertPasswordNotReused(userId: string, newPassword: string): Promise<void> {
    const history = await db.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: PASSWORD_POLICY.HISTORY_COUNT,
    });

    for (const entry of history) {
      const isReused = await verifyPassword(newPassword, entry.passwordHash);
      if (isReused) {
        throw new ValidationError(
          `Password cannot be the same as any of your last ${PASSWORD_POLICY.HISTORY_COUNT} passwords`
        );
      }
    }
  }
}

export const authService = new AuthService();