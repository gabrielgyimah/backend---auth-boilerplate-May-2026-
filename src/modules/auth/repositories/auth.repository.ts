/**
 * Auth Repository — database access for all authentication entities
 *
 * Changes:
 * - All `any` types removed; Prisma-generated types used throughout.
 * - `upsertDevice` had an unsafe filter construction using `.filter(Boolean) as any`
 *   which collapsed the OR clause to a single element under certain conditions,
 *   causing incorrect device matching. Rewritten with explicit conditional logic.
 * - `emailExists` was a findUnique instead of count; replaced with count (avoids
 *   fetching row data unnecessarily and is slightly faster).
 * - `findValidOtpRequest` now orders by createdAt desc explicitly to always return
 *   the most recent pending request.
 */

import { db } from '@/infrastructure/database/prisma';
import { OTPStatus, OTPType, SessionStatus, DeviceTrustStatus } from '@generated/prisma/client';

export interface CreateDeviceInput {
  userId: string;
  deviceName: string;
  deviceType: string;
  deviceOs?: string;
  deviceBrowser?: string;
  fingerprint?: string;
}

export class AuthRepository {
  // ---------------------------------------------------------------------------
  // REFRESH TOKENS
  // ---------------------------------------------------------------------------

  async createRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    tokenVersion = 1
  ) {
    return db.refreshToken.create({
      data: { userId, tokenHash, expiresAt, tokenVersion },
    });
  }

  async findRefreshTokenByHash(tokenHash: string) {
    return db.refreshToken.findUnique({ where: { tokenHash } });
  }

  async revokeRefreshToken(tokenHash: string) {
    return db.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async isRefreshTokenValid(tokenHash: string): Promise<boolean> {
    const token = await db.refreshToken.findUnique({ where: { tokenHash } });
    if (!token) return false;
    if (token.revokedAt) return false;
    if (token.expiresAt < new Date()) return false;
    return true;
  }

  // ---------------------------------------------------------------------------
  // SESSIONS
  // ---------------------------------------------------------------------------

  async createSession(input: {
    userId: string;
    refreshTokenId: string;
    tokenHash: string;
    deviceId?: string;
    ipAddress: string;
    userAgent?: string;
    expiresAt: Date;
  }) {
    return db.session.create({
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
    return db.session.findFirst({
      where: { tokenHash, status: SessionStatus.ACTIVE },
      include: { user: true, device: true },
    });
  }

  async invalidateSession(sessionId: string) {
    return db.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.LOGGED_OUT, deletedAt: new Date() },
    });
  }

  async findActiveSessionsByUserId(userId: string) {
    return db.session.findMany({
      where: { userId, status: SessionStatus.ACTIVE, expiresAt: { gt: new Date() } },
      include: { device: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // DEVICES
  // ---------------------------------------------------------------------------

  async upsertDevice(input: CreateDeviceInput) {
    // Build the where clause carefully — fingerprint match is preferred; fall
    // back to name+type. Avoids the unsafe .filter(Boolean) as any pattern.
    const existingDevice = await (() => {
      if (input.fingerprint) {
        return db.device.findFirst({
          where: { userId: input.userId, fingerprint: input.fingerprint, deletedAt: null },
        });
      }
      return db.device.findFirst({
        where: {
          userId: input.userId,
          name: input.deviceName,
          deviceType: input.deviceType,
          deletedAt: null,
        },
      });
    })();

    if (existingDevice) {
      return db.device.update({
        where: { id: existingDevice.id },
        data: {
          lastUsedAt: new Date(),
          deviceOs: input.deviceOs,
          deviceBrowser: input.deviceBrowser,
        },
      });
    }

    return db.device.create({
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
    return db.device.findUnique({ where: { id: deviceId } });
  }

  async findDevicesByUserId(userId: string) {
    return db.device.findMany({ where: { userId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  async updateDeviceTrust(deviceId: string, isTrusted: boolean) {
    return db.device.update({
      where: { id: deviceId },
      data: {
        isTrusted,
        trustedAt: isTrusted ? new Date() : null,
        trustStatus: isTrusted ? DeviceTrustStatus.TRUSTED : DeviceTrustStatus.UNTRUSTED,
      },
    });
  }

  async deleteDevice(deviceId: string) {
    return db.device.update({ where: { id: deviceId }, data: { deletedAt: new Date() } });
  }

  // ---------------------------------------------------------------------------
  // OTP
  // ---------------------------------------------------------------------------

  /**
   * Creates an OTP request after invalidating all existing pending OTPs of
   * the same type for this user (prevents OTP spam / session confusion).
   * `otpCode` should be the HMAC hash of the actual OTP (not plaintext).
   */
  async createOtpRequest(
    userId: string,
    otpCode: string,   // HMAC hash — never plaintext
    otpType: OTPType,
    expiresAt: Date,
    recipient: string
  ) {
    await db.oTPRequest.updateMany({
      where: { userId, type: otpType, status: OTPStatus.PENDING },
      data: { status: OTPStatus.EXPIRED },
    });

    return db.oTPRequest.create({
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
    return db.oTPRequest.findFirst({
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
    return db.oTPRequest.findUnique({ where: { id } });
  }

  async verifyOtpRequest(otpId: string) {
    return db.oTPRequest.update({
      where: { id: otpId },
      data: { verifiedAt: new Date(), status: OTPStatus.VERIFIED },
    });
  }

  async incrementOtpAttempts(otpId: string) {
    return db.oTPRequest.update({
      where: { id: otpId },
      data: { attempts: { increment: 1 } },
    });
  }

  async expireOtpRequest(otpId: string) {
    return db.oTPRequest.update({
      where: { id: otpId },
      data: { status: OTPStatus.EXPIRED },
    });
  }

  // ---------------------------------------------------------------------------
  // PASSWORD RESET TOKENS
  // ---------------------------------------------------------------------------

  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    return db.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
  }

  async findValidResetToken(tokenHash: string) {
    return db.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async markResetTokenAsUsed(tokenHash: string) {
    return db.passwordResetToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // LOGIN TRACKING (atomic)
  // ---------------------------------------------------------------------------

  async incrementFailedLoginAttempts(userId: string): Promise<number> {
    const updated = await db.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 }, lastFailedLoginAt: new Date() },
    });
    return updated.failedLoginAttempts;
  }

  async resetFailedLoginAttempts(userId: string) {
    return db.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lastFailedLoginAt: null },
    });
  }

  async lockAccount(userId: string, reason: string) {
    return db.user.update({
      where: { id: userId },
      data: { isAccountLocked: true, accountLockedAt: new Date(), accountLockedReason: reason },
    });
  }

  // ---------------------------------------------------------------------------
  // USER LOOKUP
  // ---------------------------------------------------------------------------

  async emailExists(email: string): Promise<boolean> {
    const count = await db.user.count({ where: { email } });
    return count > 0;
  }

  // ---------------------------------------------------------------------------
  // EMAIL VERIFICATION
  // ---------------------------------------------------------------------------

  async createEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date) {
    return db.emailVerificationToken.create({ data: { userId, tokenHash, expiresAt } });
  }

  async findValidEmailVerificationToken(tokenHash: string) {
    return db.emailVerificationToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async markEmailVerificationTokenAsUsed(tokenHash: string) {
    return db.emailVerificationToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });
  }

  async verifyUserEmail(userId: string) {
    return db.user.update({
      where: { id: userId },
      data: { isEmailVerified: true, emailVerifiedAt: new Date() },
    });
  }
}

export const authRepository = new AuthRepository();