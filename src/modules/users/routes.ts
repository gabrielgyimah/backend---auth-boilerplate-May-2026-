/**
 * User Routes
 *
 * IDOR remediation:
 * Self-service operations (change-password, 2FA, verify-email/phone) moved from
 * /:id/... to /me/... paths. The controller uses the JWT subject — not the URL
 * param — so there is no route where a user can target another user's identity.
 *
 * Admin-only operations (lock/unlock, full update, delete, create) continue to
 * use /:id and are gated by hasPermission middleware.
 */

import { Router } from 'express';
import { authenticate } from '@/core/middlewares/auth.middleware';
import { hasPermission } from '@/core/middlewares/auth.guard';
import { PERMISSION_CODES } from '@/core/constants';
import { userController } from '@/modules/users/controllers/user.controller';

const router = Router();

// ============================================================================
// ADMIN — user management (requires explicit permissions)
// ============================================================================

router.post(
  '/',
  authenticate,
  hasPermission(PERMISSION_CODES.USERS_CREATE),
  userController.createUser.bind(userController)
);

router.get(
  '/',
  authenticate,
  hasPermission(PERMISSION_CODES.USERS_READ),
  userController.getAllUsers.bind(userController)
);

router.get(
  '/:id',
  authenticate,
  hasPermission(PERMISSION_CODES.USERS_READ),
  userController.getUser.bind(userController)
);

router.put(
  '/:id',
  authenticate,
  hasPermission(PERMISSION_CODES.USERS_UPDATE),
  userController.updateUser.bind(userController)
);

router.delete(
  '/:id',
  authenticate,
  hasPermission(PERMISSION_CODES.USERS_DELETE),
  userController.deleteUser.bind(userController)
);

router.post(
  '/:id/lock',
  authenticate,
  hasPermission(PERMISSION_CODES.USERS_UPDATE),
  userController.lockAccount.bind(userController)
);

router.post(
  '/:id/unlock',
  authenticate,
  hasPermission(PERMISSION_CODES.USERS_UPDATE),
  userController.unlockAccount.bind(userController)
);

// ============================================================================
// SELF-SERVICE — /me prefix (no IDOR possible — JWT subject used as target)
// ============================================================================

router.post(
  '/me/change-password',
  authenticate,
  userController.changePassword.bind(userController)
);

router.post(
  '/me/2fa/enable',
  authenticate,
  userController.enable2FA.bind(userController)
);

router.post(
  '/me/2fa/disable',
  authenticate,
  userController.disable2FA.bind(userController)
);

router.post(
  '/me/verify-email',
  authenticate,
  userController.verifyEmail.bind(userController)
);

router.post(
  '/me/verify-phone',
  authenticate,
  userController.verifyPhone.bind(userController)
);

export default router;