/**
 * Auth Repository
 * Handles authentication-related database operations
 * 
 * FIXES:
 * - No raw tokens stored anywhere – only hashes
 * - Session references refreshTokenId instead of storing token
 * - Atomic increment for failed login attempts
 * - OTP spam control: invalidate old pending OTPs
 */

import { hashToken } from '@/core/utils';
import { db } from '@/infrastructure/database/prisma';
import { OTPStatus, OTPType, SessionStatus } from '@generated/prisma/client';

export interface CreateDeviceInput {
  userId: string;
  deviceName: string;
  deviceType: string;
  deviceOs?: string;
  deviceBrowser?: string;
  fingerprint?: string;
}

export class AuthRepository {
  // -------------------------------------------------------------------------
  // Refresh Tokens
  // -------------------------------------------------------------------------

  /**
   * Store a new refresh token (only the hash).
   * Returns the created record.
   */
  async createRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    tokenVersion?: number
  ) {
    return await db.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        tokenVersion: tokenVersion ?? 1,
      },
    });
  }

  /**
   * Find a refresh token by its hash.
   */
  async findRefreshTokenByHash(tokenHash: string) {
    return await db.refreshToken.findUnique({
      where: { tokenHash },
    });
  }

  /**
   * Revoke a refresh token (soft delete).
   */
  async revokeRefreshToken(tokenHash: string) {
    return await db.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Check if a refresh token is revoked or expired.
   */
  async isRefreshTokenValid(tokenHash: string): Promise<boolean> {
    const token = await db.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!token) return false;
    if (token.revokedAt) return false;
    if (token.expiresAt < new Date()) return false;
    return true;
  }

  // -------------------------------------------------------------------------
  // Sessions
  // -------------------------------------------------------------------------

  /**
   * Create a session linked to a refresh token.
   * Stores only the token hash (no raw token).
   */
  async createSession(input: {
    userId: string;
    refreshTokenId: string;
    tokenHash: string;
    deviceId?: string;
    ipAddress: string;
    userAgent?: string;
    expiresAt: Date;
  }) {
    return await db.session.create({
      data: {
        userId: input.userId,
        refreshTokenId: input.refreshTokenId,
        tokenHash: input.tokenHash,
        deviceId: input.deviceId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        expiresAt: input.expiresAt,
        status: SessionStatus.ACTIVE,
      },
    });
  }

  async findSessionByTokenHash(tokenHash: string) {
    return await db.session.findFirst({
      where: { tokenHash, status: SessionStatus.ACTIVE },
      include: { user: true, device: true },
    });
  }

  async invalidateSession(sessionId: string) {
    return await db.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.LOGGED_OUT,
        deletedAt: new Date(),
      },
    });
  }

  async findActiveSessionsByUserId(userId: string) {
    return await db.session.findMany({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
      include: { device: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // -------------------------------------------------------------------------
  // Devices
  // -------------------------------------------------------------------------

  async upsertDevice(input: CreateDeviceInput) {
    const existingDevice = await db.device.findFirst({
      where: {
        userId: input.userId,
        deletedAt: null,
        OR: [
          input.fingerprint ? { fingerprint: input.fingerprint } : undefined,
          {
            name: input.deviceName,
            deviceType: input.deviceType,
          },
        ].filter(Boolean) as any,
      },
    });

    if (existingDevice) {
      return await db.device.update({
        where: { id: existingDevice.id },
        data: {
          lastUsedAt: new Date(),
          deviceOs: input.deviceOs,
          deviceBrowser: input.deviceBrowser,
        },
      });
    }

    return await db.device.create({
      data: {
        userId: input.userId,
        name: input.deviceName,
        deviceType: input.deviceType,
        deviceOs: input.deviceOs,
        deviceBrowser: input.deviceBrowser,
        fingerprint: input.fingerprint,
        isTrusted: false,
        lastUsedAt: new Date(),
      },
    });
  }

  async findDeviceById(deviceId: string) {
    return await db.device.findUnique({
      where: { id: deviceId },
    });
  }

  async findDevicesByUserId(userId: string) {
    return await db.device.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateDeviceTrust(deviceId: string, isTrusted: boolean) {
    return await db.device.update({
      where: { id: deviceId },
      data: {
        isTrusted,
        trustedAt: isTrusted ? new Date() : null,
        trustStatus: isTrusted ? 'TRUSTED' : 'UNTRUSTED',
      },
    });
  }

  async deleteDevice(deviceId: string) {
    return await db.device.update({
      where: { id: deviceId },
      data: { deletedAt: new Date() },
    });
  }

  // -------------------------------------------------------------------------
  // OTP
  // -------------------------------------------------------------------------

  /**
   * Create an OTP request, first invalidating any existing pending OTPs
   * for the same user and type to prevent spam.
   */
  async createOtpRequest(
    userId: string,
    otpCode: string,
    otpType: OTPType,
    expiresAt: Date,
    recipient: string
  ) {
    // Invalidate any existing pending OTPs of the same type
    await db.oTPRequest.updateMany({
      where: {
        userId,
        type: otpType,
        status: OTPStatus.PENDING,
      },
      data: { status: OTPStatus.EXPIRED },
    });

    return await db.oTPRequest.create({
      data: {
        userId,
        code: otpCode,
        type: otpType,
        expiresAt,
        recipient,
        attempts: 0,
        status: OTPStatus.PENDING,
      },
    });
  }

  async findValidOtpRequest(userId: string, otpType: OTPType) {
    return await db.oTPRequest.findFirst({
      where: {
        userId,
        type: otpType,
        status: OTPStatus.PENDING,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOtpRequestById(id: string) {
    return await db.oTPRequest.findUnique({
      where: { id },
    });
  }

  async verifyOtpRequest(otpId: string) {
    return await db.oTPRequest.update({
      where: { id: otpId },
      data: {
        verifiedAt: new Date(),
        status: OTPStatus.VERIFIED,
      },
    });
  }

  async incrementOtpAttempts(otpId: string) {
    return await db.oTPRequest.update({
      where: { id: otpId },
      data: { attempts: { increment: 1 } },
    });
  }

  async expireOtpRequest(otpId: string) {
    return await db.oTPRequest.update({
      where: { id: otpId },
      data: { status: OTPStatus.EXPIRED },
    });
  }

  // -------------------------------------------------------------------------
  // Password reset tokens
  // -------------------------------------------------------------------------

  /**
   * Store only the hash of the password reset token.
   * The raw token is never persisted.
   */
  async createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ) {
    return await db.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findValidResetToken(tokenHash: string) {
    return await db.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async markResetTokenAsUsed(tokenHash: string) {
    return await db.passwordResetToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });
  }

  // -------------------------------------------------------------------------
  // Login tracking (atomic increments)
  // -------------------------------------------------------------------------

  async incrementFailedLoginAttempts(userId: string): Promise<number> {
    const updated = await db.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
        lastFailedLoginAt: new Date(),
      },
    });
    return updated.failedLoginAttempts;
  }

  async resetFailedLoginAttempts(userId: string) {
    return await db.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
      },
    });
  }

  async lockAccount(userId: string, reason: string) {
    return await db.user.update({
      where: { id: userId },
      data: {
        isAccountLocked: true,
        accountLockedAt: new Date(),
        accountLockedReason: reason,
      },
    });
  }

  // -------------------------------------------------------------------------
  // User lookup
  // -------------------------------------------------------------------------

  async emailExists(email: string): Promise<boolean> {
    const count = await db.user.count({ where: { email } });
    return count > 0;
  }

  // -------------------------------------------------------------------------
  // Email verification
  // -------------------------------------------------------------------------

  async createEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date) {
    return await db.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findValidEmailVerificationToken(tokenHash: string) {
    return await db.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async markEmailVerificationTokenAsUsed(tokenHash: string) {
    return await db.emailVerificationToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });
  }

  async verifyUserEmail(userId: string) {
    return await db.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });
  }
}

export const authRepository = new AuthRepository();