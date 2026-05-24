/**
 * Auth Routes
 *
 * Changes:
 * - Added dedicated strict rate-limiter on login, verify-login, and password-reset
 *   endpoints (5 req / 15 min per IP). The global limiter in app.ts is 100 req/15 min
 *   which is far too permissive for brute-force-sensitive endpoints.
 * - /refresh now reads token from HttpOnly cookie only (cookie-parser must be
 *   applied in app.ts before this router).
 * - Removed inline arrow-function wrappers — controller methods are already bound
 *   correctly via class instantiation; binding is unnecessary noise.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '@/core/middlewares/auth.middleware';
import { authController } from '@/modules/auth/controllers/auth.controller';
import { RATE_LIMIT } from '@/core/constants';

const router = Router();

// Strict limiter for authentication-sensitive routes
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT.LOGIN_WINDOW_MS,
  max: RATE_LIMIT.LOGIN_MAX_REQUESTS,
  message: 'Too many attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// ============================================================================
// REGISTRATION & EMAIL VERIFICATION
// ============================================================================

router.post('/register', authLimiter, authController.register.bind(authController));
router.post('/verify-email', authController.verifyEmail.bind(authController));

// ============================================================================
// LOGIN & 2FA
// ============================================================================

router.post('/login', authLimiter, authController.login.bind(authController));
router.post('/2fa/verify-login', authLimiter, authController.verifyLoginOtp.bind(authController));

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

router.post('/refresh', authController.refreshToken.bind(authController));

// ============================================================================
// LOGOUT (requires valid access token)
// ============================================================================

router.post('/logout', authenticate, authController.logout.bind(authController));

// ============================================================================
// PASSWORD MANAGEMENT
// ============================================================================

router.post('/password/reset-request', authLimiter, authController.requestPasswordReset.bind(authController));
router.post('/password/reset', authLimiter, authController.resetPassword.bind(authController));
router.post('/password/change', authenticate, authController.changePassword.bind(authController));

// ============================================================================
// 2FA ACCOUNT SETTINGS (authenticated)
// ============================================================================

router.post('/2fa/enable', authenticate, authController.enableTwoFactor.bind(authController));
router.post('/2fa/verify', authenticate, authController.verifyTwoFactorOtp.bind(authController));
router.post('/2fa/disable', authenticate, authController.disableTwoFactor.bind(authController));

export default router;