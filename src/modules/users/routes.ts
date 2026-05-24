/**
 * User Routes
 * Defines all user-related endpoints
 */

import { Router } from 'express';
import { authenticate } from '@/core/middlewares/auth.middleware';
import { hasPermission } from '@/core/middlewares/auth.guard';
import { PERMISSION_CODES } from '@/core/constants';
import { userController } from '@/modules/users/controllers/user.controller';

const router = Router();

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, lastName, password, roleId]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               roleId:
 *                 type: string
 *               branchId:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post(
  '/',
  authenticate,
  hasPermission(PERMISSION_CODES.USERS_CREATE),
  (req, res, next) => userController.createUser(req, res, next)
);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users with pagination
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *       - in: query
 *         name: firstName
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get(
  '/',
  authenticate,
  hasPermission(PERMISSION_CODES.USERS_READ),
  (req, res, next) => userController.getAllUsers(req, res, next)
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User retrieved successfully
 */
router.get(
  '/:id',
  authenticate,
  hasPermission(PERMISSION_CODES.USERS_READ),
  (req, res, next) => userController.getUser(req, res, next)
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.put(
  '/:id',
  authenticate,
  hasPermission(PERMISSION_CODES.USERS_UPDATE),
  (req, res, next) => userController.updateUser(req, res, next)
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.delete(
  '/:id',
  authenticate,
  hasPermission(PERMISSION_CODES.USERS_DELETE),
  (req, res, next) => userController.deleteUser(req, res, next)
);

/**
 * @swagger
 * /api/v1/users/{id}/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.post(
  '/:id/change-password',
  authenticate,
  (req, res, next) => userController.changePassword(req, res, next)
);

/**
 * @swagger
 * /api/v1/users/{id}/lock:
 *   post:
 *     summary: Lock user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: User account locked
 */
router.post(
  '/:id/lock',
  authenticate,
  hasPermission(PERMISSION_CODES.USERS_UPDATE),
  (req, res, next) => userController.lockAccount(req, res, next)
);

/**
 * @swagger
 * /api/v1/users/{id}/unlock:
 *   post:
 *     summary: Unlock user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User account unlocked
 */
router.post(
  '/:id/unlock',
  authenticate,
  hasPermission(PERMISSION_CODES.USERS_UPDATE),
  (req, res, next) => userController.unlockAccount(req, res, next)
);

/**
 * @swagger
 * /api/v1/users/{id}/2fa/enable:
 *   post:
 *     summary: Enable 2FA for user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [secret]
 *             properties:
 *               secret:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
 */
router.post(
  '/:id/2fa/enable',
  authenticate,
  (req, res, next) => userController.enable2FA(req, res, next)
);

/**
 * @swagger
 * /api/v1/users/{id}/2fa/disable:
 *   post:
 *     summary: Disable 2FA for user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 2FA disabled successfully
 */
router.post(
  '/:id/2fa/disable',
  authenticate,
  (req, res, next) => userController.disable2FA(req, res, next)
);

/**
 * @swagger
 * /api/v1/users/{id}/verify-email:
 *   post:
 *     summary: Verify user email
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
router.post(
  '/:id/verify-email',
  authenticate,
  (req, res, next) => userController.verifyEmail(req, res, next)
);

/**
 * @swagger
 * /api/v1/users/{id}/verify-phone:
 *   post:
 *     summary: Verify user phone
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Phone verified successfully
 */
router.post(
  '/:id/verify-phone',
  authenticate,
  (req, res, next) => userController.verifyPhone(req, res, next)
);

export default router;
