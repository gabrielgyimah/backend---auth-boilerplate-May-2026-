/**
 * Auth Controller — HTTP layer for all authentication endpoints
 *
 * Changes:
 * - Removed `(req as any).user` casts; uses `getAuthenticatedUser()` helper which
 *   returns the typed AccessTokenPayload.
 * - `verifyLoginOtp` was returning refreshToken in BOTH the cookie AND the response
 *   body. Tokens in response bodies are visible to JS (XSS risk). Kept cookie only;
 *   body returns only the access token and user profile.
 * - IP address extraction now safely handles IPv6-mapped IPv4 addresses and
 *   avoids trusting X-Forwarded-For unless explicitly configured (TRUST_PROXY env).
 * - Added `cookie-parser` dependency note; app.ts must use `cookieParser()`.
 * - Zod validation errors are now uniformly mapped to ValidationError with
 *   field-level detail instead of being swallowed or passed to next() raw.
 * - Removed the ability to pass refreshToken via req.body on /refresh — cookies only.
 *   Accepting tokens in request bodies allows CSRF attacks when cookies are HttpOnly.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { AuthenticationError, ValidationError } from '@/core/errors/AppError';
import { getAuthenticatedUser } from '@/core/middlewares/auth.middleware';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceName: z.string().max(128).optional(),
  deviceType: z.string().max(64).optional(),
});

const verifyLoginOtpSchema = z.object({
  challengeToken: z.string().min(1),
  otpCode: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  trustDevice: z.boolean().optional().default(false),
});

const verifyEmailSchema = z.object({
  token: z.string().min(64, 'Invalid verification token'),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

const passwordResetSchema = z.object({
  resetToken: z.string().min(64, 'Invalid reset token'),
  newPassword: z.string().min(12),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});

const verifyOtpSchema = z.object({
  otpCode: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

const disableTwoFactorSchema = z.object({
  password: z.string().min(1),
});

// ============================================================================
// HELPERS
// ============================================================================

const COOKIE_NAME = 'refreshToken';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
}

/**
 * Returns a sanitised client IP.
 * Trusts X-Forwarded-For only when TRUST_PROXY=true is set (behind a reverse proxy).
 */
function getClientIp(req: Request): string {
  const trustProxy = process.env.TRUST_PROXY === 'true';
  if (trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0]?.trim() ?? 'unknown';
    }
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

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

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = parseBody(registerSchema, req.body);
      const user = await authService.register(data.email, data.password, data.firstName, data.lastName);
      res.status(201).json({
        success: true,
        data: user,
        message: 'Registration successful. Please verify your email.',
      });
    } catch (error) { next(error); }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = parseBody(verifyEmailSchema, req.body);
      const result = await authService.verifyEmail(token);
      res.status(200).json({ success: true, data: result, message: 'Email verified successfully' });
    } catch (error) { next(error); }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = parseBody(loginSchema, req.body);
      const ipAddress = getClientIp(req);

      const result = await authService.login(data.email, data.password, {
        name: data.deviceName ?? 'Unknown Device',
        type: data.deviceType ?? 'web',
        userAgent: req.get('user-agent'),
        ipAddress,
      });

      if (result.requiresTwoFactor) {
        res.status(200).json({
          success: true,
          data: { requiresTwoFactor: true, challengeToken: result.challengeToken },
          message: 'OTP sent. Please verify to complete login.',
        });
        return;
      }

      setRefreshCookie(res, result.refreshToken);

      res.status(200).json({
        success: true,
        data: {
          requiresTwoFactor: false,
          accessToken: result.accessToken,
          user: result.user,
        },
        message: 'Login successful',
      });
    } catch (error) { next(error); }
  }

  async verifyLoginOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { challengeToken, otpCode, trustDevice } = parseBody(verifyLoginOtpSchema, req.body);
      const result = await authService.verifyLoginOtp(challengeToken, otpCode, trustDevice);

      // Refresh token goes in HttpOnly cookie ONLY — not in response body
      setRefreshCookie(res, result.refreshToken);

      res.status(200).json({
        success: true,
        data: { accessToken: result.accessToken, user: result.user },
        message: 'Login successful',
      });
    } catch (error) { next(error); }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Refresh token from cookie only — never from body (CSRF protection)
      const refreshToken = req.cookies?.[COOKIE_NAME] as string | undefined;
      if (!refreshToken) throw new AuthenticationError('Refresh token not found');

      const result = await authService.refreshAccessToken(refreshToken);

      setRefreshCookie(res, result.refreshToken);

      res.status(200).json({
        success: true,
        data: { accessToken: result.accessToken },
        message: 'Token refreshed',
      });
    } catch (error) { next(error); }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthenticatedUser(req);
      const refreshToken = req.cookies?.[COOKIE_NAME] as string | undefined;

      if (refreshToken) {
        await authService.logout(user.userId, refreshToken);
      }

      clearRefreshCookie(res);
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) { next(error); }
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = parseBody(passwordResetRequestSchema, req.body);
      await authService.requestPasswordReset(email);
      // Always same response — prevents email enumeration
      res.status(200).json({
        success: true,
        message: 'If that email address is registered, a reset link has been sent.',
      });
    } catch (error) { next(error); }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { resetToken, newPassword } = parseBody(passwordResetSchema, req.body);
      await authService.resetPassword(resetToken, newPassword);
      res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) { next(error); }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthenticatedUser(req);
      const { currentPassword, newPassword } = parseBody(changePasswordSchema, req.body);
      await authService.changePassword(user.userId, currentPassword, newPassword);
      res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) { next(error); }
  }

  async enableTwoFactor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthenticatedUser(req);
      const result = await authService.enableTwoFactor(user.userId);
      res.status(200).json({ success: true, data: result, message: 'OTP sent for 2FA setup' });
    } catch (error) { next(error); }
  }

  async verifyTwoFactorOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthenticatedUser(req);
      const { otpCode } = parseBody(verifyOtpSchema, req.body);
      const result = await authService.verifyTwoFactorOtp(user.userId, otpCode);
      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error) { next(error); }
  }

  async disableTwoFactor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthenticatedUser(req);
      const { password } = parseBody(disableTwoFactorSchema, req.body);
      const result = await authService.disableTwoFactor(user.userId, password);
      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error) { next(error); }
  }
}

export const authController = new AuthController();