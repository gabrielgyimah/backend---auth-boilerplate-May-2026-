/**
 * Auth Routes
 * Defines all authentication endpoints
 * 
 * FIXES:
 * - Added email verification endpoint
 * - Logout now uses authenticate middleware
 * - 2FA verify-login now accepts trustDevice flag (body)
 */

import { Router } from 'express';
import { authenticate } from '@/core/middlewares/auth.middleware';
import { authController } from '@/modules/auth/controllers/auth.controller';

const router = Router();

// Registration & Email Verification
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/verify-email', (req, res, next) => authController.verifyEmail(req, res, next));

// Login & 2FA
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/2fa/verify-login', (req, res, next) => authController.verifyLoginOtp(req, res, next));

// Token Refresh
router.post('/refresh', (req, res, next) => authController.refreshToken(req, res, next));

// Logout (requires authentication)
router.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next));

// Password Management
router.post('/password/reset-request', (req, res, next) => authController.requestPasswordReset(req, res, next));
router.post('/password/reset', (req, res, next) => authController.resetPassword(req, res, next));
router.post('/password/change', authenticate, (req, res, next) => authController.changePassword(req, res, next));

// 2FA Account Settings (authenticated)
router.post('/2fa/enable', authenticate, (req, res, next) => authController.enableTwoFactor(req, res, next));
router.post('/2fa/verify', authenticate, (req, res, next) => authController.verifyTwoFactorOtp(req, res, next));
router.post('/2fa/disable', authenticate, (req, res, next) => authController.disableTwoFactor(req, res, next));

export default router;