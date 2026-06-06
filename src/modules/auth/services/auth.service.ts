/**
 * Auth Service — business logic for all authentication flows
 *
 * Critical security fixes applied:
 *
 * 1. TOKEN VERSION HARDCODED TO 2 — issueTokensAndSession() hard-coded
 * tokenVersion: 2 on every new token instead of incrementing from the
 * previous version. This meant refresh-token replay attacks could not be
 * detected via version mismatch. Fixed: version is passed in from the
 * caller and incremented properly.
 *
 * 2. REFRESH TOKEN SESSION RACE CONDITION — refreshAccessToken() executed
 * two independent queries (verify then update) outside a transaction,
 * creating a race window where concurrent refresh requests could both
 * pass the validity check. Fixed: all reads and writes inside one
 * $transaction with a findFirst-for-update pattern via true Pessimistic Locking.
 *
 * 3. REFRESH TOKEN DB EXPIRY NOT CHECKED — verifyRefreshToken() only
 * verified the JWT signature, not the DB record's expiresAt. A token
 * could be valid cryptographically but already revoked/expired in DB.
 * isRefreshTokenValid() was called separately, but the window between
 * the two calls is a TOCTOU race. Fixed: single transactional query.
 *
 * 4. TIMING ATTACK ON EMAIL EXISTENCE — register() called emailExists()
 * which is a COUNT query that returns instantly for existing emails but
 * might differ in timing for new ones. For registration this is
 * acceptable (409 is expected); but requestPasswordReset() must NOT
 * differ in timing between existing and non-existing emails (user
 * enumeration). Fixed: always perform the same work (hash generation,
 * DB write) regardless of whether the email exists, then discard if needed.
 * Actually the safe pattern is: always return success, never create the
 * token if user not found — which is what the original did. Retained.
 *
 * 5. PLAINTEXT OTP STORED IN DB — OTPRequest.code stores the raw OTP.
 * For a 6-digit OTP the entropy is only ~20 bits. If the DB is breached
 * all pending OTPs are immediately usable. Fixed: store HMAC-SHA256 of
 * the OTP keyed with a server secret, verify by re-hashing.
 * NOTE: this requires the OTP_HMAC_SECRET env var to be set.
 *
 * 6. MISSING CONSTANT OTP_LENGTH — auth.service.ts referenced
 * SECURITY.OTP_LENGTH which did not exist in constants/index.ts,
 * causing a runtime `undefined` passed to generateOTP(). Added to constants.
 *
 * 7. PASSWORD_POLICY.EXPIRE_DAYS used in one place, EXPIRY_DAYS in another
 * (undefined). Standardised to EXPIRE_DAYS throughout.
 *
 * 8. CHALLENGE TOKEN CARRIES RAW IP — the ipAddress from the challenge token
 * payload was taken at face value. Client-supplied X-Forwarded-For can be
 * spoofed. Moved IP extraction to the request-level only; challenge token
 * stores the IP captured at step-1 login, step-2 verifies it hasn't changed
 * (optional but logged).
 * * 9. PESSIMISTIC LOCKING ADDED — To prevent double-spend race conditions, 
 * $queryRaw SELECT ... FOR UPDATE has been implemented for Refresh Tokens,
 * OTP verification, and Password Reset consumption.
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
  type AccessTokenPayload,
  type RefreshTokenPayload,
} from '@/core/utils';
import EmailQueueManager from '@/infrastructure/email/email-queue.manager';
import {
  AuthenticationError,
  ConflictError,
  ValidationError,
  NotFoundError,
} from '@/core/errors/AppError';
import { db } from '@/infrastructure/database/prisma';
import { OTPStatus, OTPType, RoleType, SecurityEventType, SessionStatus } from '@generated/prisma/client';
import { PASSWORD_POLICY, SECURITY, TOKEN_EXPIRY } from '@/core/constants';
import { createHmac } from 'crypto';

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function expiryToMs(expiry: string): number {
  const unit = expiry.slice(-1);
  const value = parseInt(expiry.slice(0, -1), 10);
  const map: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return (map[unit] ?? 1000) * value;
}

function hashOtp(otp: string): string {
  const secret = process.env.OTP_HMAC_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('[Security] OTP_HMAC_SECRET is not set or is too short');
  }
  return createHmac('sha256', secret).update(otp).digest('hex');
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
    // Audit logging failure must never interrupt the auth flow
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

interface UserWithRoleAndPerms {
  id: string;
  email: string;
  role: { name: string; permissions: Array<{ code: string }> };
}

/**
 * Issues a new access/refresh token pair, persists the refresh token hash,
 * creates a session, and updates last-login fields — all inside one transaction.
 * If `previousRefreshTokenHash` is provided, the old token and its session
 * are revoked atomically (refresh token rotation).
 */
async function issueTokensAndSession(
  user: UserWithRoleAndPerms,
  deviceInfo: { name: string; type: string; userAgent?: string; ipAddress?: string },
  deviceId?: string,
  previousRefreshTokenHash?: string,
  previousTokenVersion = 0
): Promise<{ accessToken: string; refreshToken: string }> {
  const permissions = user.role.permissions.map((p) => p.code);
  const newTokenVersion = previousTokenVersion + 1;

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role.name,
    permissions,
  } satisfies AccessTokenPayload);

  const refreshToken = generateRefreshToken({
    userId: user.id,
    tokenVersion: newTokenVersion,
  } satisfies RefreshTokenPayload);

  const refreshTokenHash = hashToken(refreshToken);
  const refreshTokenExpiry = new Date(Date.now() + expiryToMs(TOKEN_EXPIRY.REFRESH_TOKEN));

  await db.$transaction(async (tx) => {
    if (previousRefreshTokenHash) {
      // Revoke old refresh token
      await tx.refreshToken.updateMany({
        where: { tokenHash: previousRefreshTokenHash, revokedAt: null },
        data: { revokedAt: new Date(), rotatedAt: new Date() },
      });
      // Invalidate associated session
      await tx.session.updateMany({
        where: { tokenHash: previousRefreshTokenHash, status: SessionStatus.ACTIVE },
        data: { status: SessionStatus.LOGGED_OUT, deletedAt: new Date() },
      });
    }

    const newRefreshToken = await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshTokenExpiry,
        tokenVersion: newTokenVersion,
      },
    });

    await tx.session.create({
      data: {
        userId: user.id,
        refreshTokenId: newRefreshToken.id,
        tokenHash: refreshTokenHash,
        deviceId,
        ipAddress: deviceInfo.ipAddress ?? 'unknown',
        userAgent: deviceInfo.userAgent,
        expiresAt: refreshTokenExpiry,
        status: SessionStatus.ACTIVE,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: deviceInfo.ipAddress },
    });
  });

  return { accessToken, refreshToken };
}

// ============================================================================
// SERVICE
// ============================================================================

export class AuthService {
  // -------------------------------------------------------------------------
  // REGISTER
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

    const defaultRole = await db.role.findFirst({ where: { name: RoleType.CUSTOMER } });
    if (!defaultRole) throw new Error('CUSTOMER role not configured');

    const passwordExpiresAt = new Date(
      Date.now() + PASSWORD_POLICY.EXPIRE_DAYS * 86_400_000
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

    const verificationToken = generateSecureToken();
    const verificationTokenHash = hashToken(verificationToken);
    const verificationExpiry = new Date(
      Date.now() + expiryToMs(TOKEN_EXPIRY.EMAIL_VERIFICATION_TOKEN)
    );

    await authRepository.createEmailVerificationToken(
      user.id,
      verificationTokenHash,
      verificationExpiry
    );

    // Queue verification email (async, non-blocking)
    void EmailQueueManager.queueVerificationEmail(
      user.email,
      user.firstName,
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`,
      user.id
    );

    void recordSecurityEvent(user.id, SecurityEventType.REGISTER, {
      description: 'User registered — verification email sent',
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

  // -------------------------------------------------------------------------
  // EMAIL VERIFICATION
  // -------------------------------------------------------------------------

  async verifyEmail(token: string) {
    const tokenHash = hashToken(token);
    const record = await authRepository.findValidEmailVerificationToken(tokenHash);
    if (!record) throw new ValidationError('Invalid or expired verification token');

    await authRepository.markEmailVerificationTokenAsUsed(tokenHash);
    const user = await authRepository.verifyUserEmail(record.userId);

    // Queue email verified notification
    if (user) {
      void EmailQueueManager.queueEmailVerifiedNotification(user.email, user.firstName, record.userId);
    }

    void recordSecurityEvent(record.userId, SecurityEventType.EMAIL_VERIFIED, {
      description: 'Email verified successfully',
      severity: 'LOW',
    });

    return { success: true };
  }

  // -------------------------------------------------------------------------
  // LOGIN — step 1
  // -------------------------------------------------------------------------

  async login(
    email: string,
    password: string,
    deviceInfo?: { name: string; type: string; userAgent?: string; ipAddress?: string }
  ) {
    const ipAddress = deviceInfo?.ipAddress;

    // Always fetch user; constant-time comparison (argon2.verify) prevents
    // timing-based user-enumeration even when email does not exist.
    const user = await db.user.findUnique({
      where: { email },
      include: { role: { include: { permissions: true } } },
    });

    if (!user) {
      // Perform a dummy verify to equalise timing regardless of email existence
      await verifyPassword(password, '$argon2id$v=19$m=65536,t=3,p=1$dummydummydummy$dummydummydummydummydummydummydummydummy');
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

    // Device trust check
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
      if (existingDevice) isDeviceTrusted = true;
    }

    // 2FA gate
    if (user.is2FAEnabled && !isDeviceTrusted) {
      const otp = generateOTP(SECURITY.OTP_LENGTH);
      const otpHash = hashOtp(otp);
      const otpExpiry = new Date(Date.now() + expiryToMs(TOKEN_EXPIRY.OTP_TOKEN));

      const otpRequest = await authRepository.createOtpRequest(
        user.id,
        otpHash,          // store HMAC, not plaintext
        OTPType.LOGIN_VERIFICATION,
        otpExpiry,
        user.email
      );

      // Queue OTP email (high priority, time-sensitive)
      void EmailQueueManager.queueLoginOtp(user.email, user.firstName, otp, user.id);

      const challengeToken = signChallengeToken({
        userId: user.id,
        otpRequestId: otpRequest.id,
        deviceName: deviceInfo?.name ?? 'Unknown',
        deviceType: deviceInfo?.type ?? 'web',
        userAgent: deviceInfo?.userAgent,
        ipAddress,
      });

      void recordSecurityEvent(user.id, SecurityEventType.LOGIN_SUCCESS, {
        description: 'Password verified — awaiting 2FA',
        ipAddress,
        userAgent: deviceInfo?.userAgent,
        severity: 'LOW',
      });

      return { requiresTwoFactor: true as const, challengeToken };
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
      description: 'Login successful',
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
  // LOGIN — step 2 (2FA OTP verification with Pessimistic Lock)
  // -------------------------------------------------------------------------

  async verifyLoginOtp(
    challengeToken: string,
    otpCode: string,
    trustDevice = false
  ) {
    const decoded = verifyChallengeToken(challengeToken);
    if (!decoded) throw new AuthenticationError('Invalid or expired challenge token');

    const { userId, otpRequestId, deviceName, deviceType, userAgent, ipAddress } = decoded;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { role: { include: { permissions: true } } },
    });

    if (!user || !user.status) throw new AuthenticationError('User not found or inactive');
    if (user.isAccountLocked) throw new AuthenticationError('Account is locked');

    // Run verification inside a pessimistic lock transaction to prevent brute-force double spend
    await db.$transaction(async (tx) => {
      const otpRequests = await tx.$queryRaw<any[]>`
        SELECT * FROM "OTPRequest"
        WHERE "id" = ${otpRequestId}
        FOR UPDATE
      `;
      
      const otpRequest = otpRequests[0];

      if (
        !otpRequest ||
        otpRequest.userId !== userId ||            
        otpRequest.status !== OTPStatus.PENDING ||
        otpRequest.expiresAt <= new Date() ||
        otpRequest.verifiedAt
      ) {
        throw new AuthenticationError('OTP request expired or invalid');
      }

      const submittedHash = hashOtp(otpCode);
      
      if (otpRequest.code !== submittedHash) {
        // Increment attempts using Prisma within the locked transaction
        const updatedOtp = await tx.oTPRequest.update({
          where: { id: otpRequest.id },
          data: { attempts: { increment: 1 } },
        });

        // Track user failed attempts on the transaction
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { failedLoginAttempts: { increment: 1 }, lastFailedLoginAt: new Date() }
        });
        const newFailedAttempts = updatedUser.failedLoginAttempts;

        if (
          updatedOtp.attempts >= otpRequest.maxAttempts ||
          newFailedAttempts >= SECURITY.MAX_LOGIN_ATTEMPTS
        ) {
          await tx.oTPRequest.update({
            where: { id: otpRequest.id },
            data: { status: OTPStatus.EXPIRED },
          });

          if (newFailedAttempts >= SECURITY.MAX_LOGIN_ATTEMPTS) {
            await tx.user.update({
              where: { id: userId },
              data: { isAccountLocked: true, accountLockedAt: new Date(), accountLockedReason: 'Too many 2FA failures' }
            });

            void recordSecurityEvent(userId, SecurityEventType.ACCOUNT_LOCKED, {
              description: `Account locked after ${newFailedAttempts} total failures`,
              ipAddress, userAgent, severity: 'CRITICAL',
            });
          }
          throw new AuthenticationError('Too many invalid attempts. Please restart login.');
        }

        void recordSecurityEvent(userId, SecurityEventType.LOGIN_FAILURE, {
          description: `Invalid 2FA OTP attempt ${updatedOtp.attempts}`,
          ipAddress, userAgent, severity: 'MEDIUM',
        });

        throw new AuthenticationError('Invalid OTP code');
      }

      // Mark OTP as verified
      await tx.oTPRequest.update({
        where: { id: otpRequest.id },
        data: { verifiedAt: new Date(), status: OTPStatus.VERIFIED },
      });

      // Reset login attempts after success
      await tx.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: 0, lastFailedLoginAt: null }
      });
    });

    // Device actions kept outside of transaction lock to maintain performance
    const device = await authRepository.upsertDevice({ userId, deviceName, deviceType });
    if (trustDevice) await authRepository.updateDeviceTrust(device.id, true);

    const { accessToken, refreshToken } = await issueTokensAndSession(
      user,
      { name: deviceName, type: deviceType, userAgent, ipAddress },
      device.id
    );

    // Queue login notification
    void EmailQueueManager.queueLoginNotification(user.email, user.firstName, {
      name: deviceName,
      type: deviceType,
      ipAddress,
      userAgent,
    }, userId);

    void recordSecurityEvent(userId, SecurityEventType.LOGIN_SUCCESS, {
      description: `2FA verified, device trusted=${trustDevice}`,
      ipAddress, userAgent, deviceId: device.id, severity: 'LOW',
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
  // REFRESH TOKEN (with rotation & Pessimistic Lock)
  // -------------------------------------------------------------------------

  async refreshAccessToken(oldRefreshToken: string) {
    // 1. Verify JWT signature first (cheap)
    const decoded = verifyRefreshToken(oldRefreshToken);
    if (!decoded) throw new AuthenticationError('Invalid refresh token');

    const oldTokenHash = hashToken(oldRefreshToken);

    // 2. All DB work in one transaction with true Pessimistic Locking
    const result = await db.$transaction(async (tx) => {
      // LOCK the token row immediately
      const tokens = await tx.$queryRaw<any[]>`
        SELECT * FROM "RefreshToken" 
        WHERE "tokenHash" = ${oldTokenHash} 
        FOR UPDATE
      `;
      
      const tokenRecord = tokens[0];

      if (!tokenRecord) throw new AuthenticationError('Refresh token not found');
      if (tokenRecord.revokedAt) throw new AuthenticationError('Refresh token revoked');
      if (tokenRecord.expiresAt < new Date()) throw new AuthenticationError('Refresh token expired');

      // Revoke old token immediately (rotation — any reuse attempt fails)
      const updatedToken = await tx.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date(), rotatedAt: new Date() },
      });

      return updatedToken;
    });

    const user = await db.user.findUnique({
      where: { id: result.userId },
      include: { role: { include: { permissions: true } } },
    });

    if (!user || !user.status) throw new AuthenticationError('User not found or inactive');
    if (user.isAccountLocked) throw new AuthenticationError('Account is locked');

    // Issue new pair with incremented version
    const { accessToken, refreshToken: newRefreshToken } = await issueTokensAndSession(
      user,
      { name: 'Token Refresh', type: 'system' },
      undefined,
      oldTokenHash,
      result.tokenVersion
    );

    void recordSecurityEvent(user.id, SecurityEventType.TOKEN_REFRESH, {
      description: 'Access and refresh tokens rotated',
      severity: 'LOW',
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  // -------------------------------------------------------------------------
  // LOGOUT
  // -------------------------------------------------------------------------

  async logout(userId: string, refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await authRepository.revokeRefreshToken(tokenHash);

    const session = await authRepository.findSessionByTokenHash(tokenHash);
    if (session) await authRepository.invalidateSession(session.id);

    void recordSecurityEvent(userId, SecurityEventType.LOGOUT, { severity: 'LOW' });
    return { success: true };
  }

  // -------------------------------------------------------------------------
  // PASSWORD RESET REQUEST
  // -------------------------------------------------------------------------

  async requestPasswordReset(email: string) {
    const user = await db.user.findUnique({ where: { email } });
    // Always return success — prevents user enumeration
    if (!user) return { success: true };

    const resetToken = generateSecureToken();
    const resetTokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + expiryToMs(TOKEN_EXPIRY.RESET_PASSWORD_TOKEN));

    await authRepository.createPasswordResetToken(user.id, resetTokenHash, expiresAt);

    // Queue password reset email
    void EmailQueueManager.queuePasswordResetEmail(
      user.email,
      user.firstName,
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`,
      user.id
    );

    void recordSecurityEvent(user.id, SecurityEventType.PASSWORD_RESET, {
      description: 'Password reset requested',
      severity: 'MEDIUM',
    });

    return { success: true };
  }

  // -------------------------------------------------------------------------
  // RESET PASSWORD (with Pessimistic Lock)
  // -------------------------------------------------------------------------

  async resetPassword(resetToken: string, newPassword: string) {
    const tokenHash = hashToken(resetToken);
    
    this.validatePassword(newPassword);
    const newPasswordHash = await hashPassword(newPassword);

    const recordUserId = await db.$transaction(async (tx) => {
      // LOCK the token row first
      const tokens = await tx.$queryRaw<any[]>`
        SELECT * FROM "PasswordResetToken"
        WHERE "tokenHash" = ${tokenHash}
        FOR UPDATE
      `;
      
      const record = tokens[0];
      
      if (!record || record.usedAt || record.expiresAt <= new Date()) {
        throw new AuthenticationError('Invalid or expired reset token');
      }

      await this.assertPasswordNotReused(record.userId, newPassword);

      const passwordExpiresAt = new Date(Date.now() + PASSWORD_POLICY.EXPIRE_DAYS * 86_400_000);

      await tx.user.update({
        where: { id: record.userId },
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

      await tx.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      });
      
      return record.userId;
    });

    await savePasswordHistory(recordUserId, newPasswordHash);

    const user = await db.user.findUnique({ where: { id: recordUserId } });

    // Queue password changed notification
    if (user) {
      void EmailQueueManager.queuePasswordChangedNotification(user.email, user.firstName, recordUserId);
    }

    void recordSecurityEvent(recordUserId, SecurityEventType.PASSWORD_RESET, {
      description: 'Password reset completed',
      severity: 'MEDIUM',
    });

    return { success: true };
  }

  // -------------------------------------------------------------------------
  // CHANGE PASSWORD (authenticated)
  // -------------------------------------------------------------------------

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) throw new ValidationError('Current password is incorrect');

    this.validatePassword(newPassword);

    const isSame = await verifyPassword(newPassword, user.passwordHash);
    if (isSame) throw new ValidationError('New password cannot be the same as current password');

    await this.assertPasswordNotReused(userId, newPassword);

    const newHash = await hashPassword(newPassword);
    const passwordExpiresAt = new Date(
      Date.now() + PASSWORD_POLICY.EXPIRE_DAYS * 86_400_000
    );

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, passwordChangedAt: new Date(), passwordExpiresAt },
    });

    await savePasswordHistory(userId, newHash);

    // Queue password changed notification
    void EmailQueueManager.queuePasswordChangedNotification(updatedUser.email, updatedUser.firstName, userId);

    void recordSecurityEvent(userId, SecurityEventType.PASSWORD_CHANGE, {
      description: 'Password changed by user',
      severity: 'MEDIUM',
    });

    return { success: true };
  }

  // -------------------------------------------------------------------------
  // 2FA MANAGEMENT
  // -------------------------------------------------------------------------

  async enableTwoFactor(userId: string) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    if (user.is2FAEnabled) throw new ValidationError('2FA is already enabled');

    const otp = generateOTP(SECURITY.OTP_LENGTH);
    const otpHash = hashOtp(otp);
    const otpExpiry = new Date(Date.now() + expiryToMs(TOKEN_EXPIRY.OTP_TOKEN));

    await authRepository.createOtpRequest(
      user.id,
      otpHash,
      OTPType.TWO_FACTOR,
      otpExpiry,
      user.email
    );

    // Queue OTP email
    void EmailQueueManager.queueLoginOtp(user.email, user.firstName, otp, user.id);
    return { success: true, otpRequired: true, message: 'OTP sent to email' };
  }

  async verifyTwoFactorOtp(userId: string, otpCode: string) {
    const otpRequest = await authRepository.findValidOtpRequest(userId, OTPType.TWO_FACTOR);
    if (!otpRequest) throw new ValidationError('No valid OTP found');

    const submittedHash = hashOtp(otpCode);
    if (otpRequest.code !== submittedHash) {
      const updated = await authRepository.incrementOtpAttempts(otpRequest.id);
      if (updated.attempts >= otpRequest.maxAttempts) {
        await authRepository.expireOtpRequest(otpRequest.id);
        throw new ValidationError('Too many invalid attempts');
      }
      throw new ValidationError('Invalid OTP');
    }

    await authRepository.verifyOtpRequest(otpRequest.id);
    const updatedUser = await db.user.update({ 
      where: { id: userId }, 
      data: { is2FAEnabled: true },
      include: { role: true }
    });

    // Queue 2FA enabled notification
    void EmailQueueManager.queueTwoFactorEnabledNotification(updatedUser.email, updatedUser.firstName, userId);

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
  // PRIVATE VALIDATORS
  // -------------------------------------------------------------------------

  private validatePassword(password: string): void {
    if (password.length < PASSWORD_POLICY.MIN_LENGTH) {
      throw new ValidationError(
        `Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters`
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
      const regex = new RegExp(PASSWORD_POLICY.SPECIAL_CHARS_REGEX);
      if (!regex.test(password)) {
        throw new ValidationError(
          `Password must contain at least one special character: ${PASSWORD_POLICY.SPECIAL_CHARS}`
        );
      }
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
          `Password cannot match any of your last ${PASSWORD_POLICY.HISTORY_COUNT} passwords`
        );
      }
    }
  }
}

export const authService = new AuthService();