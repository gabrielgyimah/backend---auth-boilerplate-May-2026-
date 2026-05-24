/**
 * Auth Controller
 * Handles HTTP requests for authentication
 * 
 * FIXES:
 * - Added email verification endpoint
 * - Added trustDevice flag for 2FA verification
 * - No reset token returned in response
 * - Logout uses authenticated user
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { AuthenticationError } from '@/core/errors/AppError';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/).regex(/[!@#$%^&*]/),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceName: z.string().optional(),
  deviceType: z.string().optional(),
});

const verifyLoginOtpSchema = z.object({
  challengeToken: z.string().min(1),
  otpCode: z.string().length(6),
  trustDevice: z.boolean().optional().default(false),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

const passwordResetSchema = z.object({
  resetToken: z.string().min(1),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/).regex(/[!@#$%^&*]/),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/).regex(/[!@#$%^&*]/),
});

const verifyOtpSchema = z.object({
  otpCode: z.string().length(6),
});

const disableTwoFactorSchema = z.object({
  password: z.string().min(1),
});

// ============================================================================
// CONTROLLER CLASS
// ============================================================================

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = registerSchema.parse(req.body);
      const user = await authService.register(data.email, data.password, data.firstName, data.lastName);
      res.status(201).json({ success: true, data: user, message: 'User registered. Please verify your email.' });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = verifyEmailSchema.parse(req.body);
      const result = await authService.verifyEmail(token);
      res.status(200).json({ success: true, data: result, message: 'Email verified successfully' });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = loginSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const result = await authService.login(data.email, data.password, {
        name: data.deviceName || 'Unknown Device',
        type: data.deviceType || 'web',
        userAgent: req.get('user-agent'),
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress as string,
      });

      if (result.requiresTwoFactor) {
        res.status(200).json({
          success: true,
          data: { requiresTwoFactor: true, challengeToken: result.challengeToken },
          message: 'OTP sent. Please verify to complete login.',
        });
        return;
      }

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        data: { requiresTwoFactor: false, accessToken: result.accessToken, user: result.user },
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyLoginOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { challengeToken, otpCode, trustDevice } = verifyLoginOtpSchema.parse(req.body);
      const result = await authService.verifyLoginOtp(challengeToken, otpCode, trustDevice);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        data: { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user },
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      if (!refreshToken) throw new AuthenticationError('Refresh token not found');

      const result = await authService.refreshAccessToken(refreshToken);
      // Optionally set the new refresh token in a cookie
      if (result.refreshToken) {
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }
      res.status(200).json({ success: true, data: { accessToken: result.accessToken }, message: 'Token refreshed' });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;
      const user = (req as any).user; // Set by authenticate middleware
      if (refreshToken && user?.userId) {
        await authService.logout(user.userId, refreshToken);
      }
      res.clearCookie('refreshToken');
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = passwordResetRequestSchema.parse(req.body);
      const result = await authService.requestPasswordReset(email);
      // No token returned in response
      res.status(200).json({ success: true, data: result, message: 'If the email exists, a reset link was sent' });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { resetToken, newPassword } = passwordResetSchema.parse(req.body);
      const result = await authService.resetPassword(resetToken, newPassword);
      res.status(200).json({ success: true, data: result, message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const userId = (req as any).user?.userId;
      if (!userId) throw new AuthenticationError('User not authenticated');
      const result = await authService.changePassword(userId, currentPassword, newPassword);
      res.status(200).json({ success: true, data: result, message: 'Password changed' });
    } catch (error) {
      next(error);
    }
  }

  async enableTwoFactor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) throw new AuthenticationError('User not authenticated');
      const result = await authService.enableTwoFactor(userId);
      res.status(200).json({ success: true, data: result, message: 'OTP sent for 2FA setup' });
    } catch (error) {
      next(error);
    }
  }

  async verifyTwoFactorOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { otpCode } = verifyOtpSchema.parse(req.body);
      const userId = (req as any).user?.userId;
      if (!userId) throw new AuthenticationError('User not authenticated');
      const result = await authService.verifyTwoFactorOtp(userId, otpCode);
      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  async disableTwoFactor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { password } = disableTwoFactorSchema.parse(req.body);
      const userId = (req as any).user?.userId;
      if (!userId) throw new AuthenticationError('User not authenticated');
      const result = await authService.disableTwoFactor(userId, password);
      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();