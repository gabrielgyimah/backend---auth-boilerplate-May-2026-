/**
 * Email Service
 * Handles all outbound email communications via Nodemailer
 *
 * Supports:
 * - Email verification tokens
 * - OTP codes (for 2FA)
 * - Password reset tokens
 * - Account notifications (login, security alerts, etc.)
 *
 * Uses environment variables for SMTP configuration:
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
 * - SMTP_FROM, SMTP_FROM_NAME
 */

import nodemailer from 'nodemailer';
import { config } from '@/config';
import logger from '@/infrastructure/database/logger';
import {
  verificationEmailTemplate,
  otpEmailTemplate,
  passwordResetTemplate,
  passwordChangedTemplate,
  twoFactorEnabledTemplate,
  loginNotificationTemplate,
} from '@/infrastructure/email/templates';

// ============================================================================
// TYPES
// ============================================================================

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// ============================================================================
// TRANSPORTER SETUP
// ============================================================================

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASSWORD) {
    throw new Error(
      '[Email] SMTP configuration incomplete. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD'
    );
  }

  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASSWORD,
    },
  });

  return transporter;
}

// ============================================================================
// SEND EMAIL HELPER
// ============================================================================

async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const transport = getTransporter();
    const from = options.from || config.SMTP_FROM || 'noreply@app.com';

    await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    logger.debug({
      msg: 'Email sent',
      to: options.to,
      subject: options.subject,
    });
  } catch (error) {
    logger.error({
      msg: 'Failed to send email',
      to: options.to,
      subject: options.subject,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw — email failures should not interrupt user operations
  }
}

// ============================================================================
// EMAIL SERVICE
// ============================================================================

export class EmailService {
  /**
   * Send email verification token for new user registration
   */
  static async sendVerificationEmail(
    email: string,
    firstName: string,
    verificationToken: string
  ): Promise<void> {
    const verificationUrl = `${config.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: email,
      subject: 'Verify your email address',
      html: verificationEmailTemplate(firstName, verificationUrl),
    });
  }

  /**
   * Send email verification success notification
   */
  static async sendEmailVerifiedNotification(
    email: string,
    firstName: string
  ): Promise<void> {
    await sendEmail({
      to: email,
      subject: 'Email verified successfully',
      html: `
        <p>Hi ${firstName},</p>
        <p>Your email address has been verified successfully.</p>
        <p>You can now use all features of our platform.</p>
      `,
    });
  }

  /**
   * Send OTP code for 2FA during login
   */
  static async sendLoginOtp(
    email: string,
    firstName: string,
    otpCode: string
  ): Promise<void> {
    await sendEmail({
      to: email,
      subject: 'Your login verification code',
      html: otpEmailTemplate(firstName, otpCode),
    });
  }

  /**
   * Send password reset token
   */
  static async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string
  ): Promise<void> {
    const resetUrl = `${config.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

    await sendEmail({
      to: email,
      subject: 'Reset your password',
      html: passwordResetTemplate(firstName, resetUrl),
    });
  }

  /**
   * Send confirmation after password change
   */
  static async sendPasswordChangedNotification(
    email: string,
    firstName: string
  ): Promise<void> {
    await sendEmail({
      to: email,
      subject: 'Your password has been changed',
      html: passwordChangedTemplate(firstName),
    });
  }

  /**
   * Send notification when 2FA is enabled
   */
  static async sendTwoFactorEnabledNotification(
    email: string,
    firstName: string,
    backupCodes?: string[]
  ): Promise<void> {
    await sendEmail({
      to: email,
      subject: 'Two-factor authentication enabled',
      html: twoFactorEnabledTemplate(firstName, backupCodes),
    });
  }

  /**
   * Send login notification for security awareness
   */
  static async sendLoginNotification(
    email: string,
    firstName: string,
    deviceInfo: {
      name: string;
      type: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    await sendEmail({
      to: email,
      subject: 'New login detected',
      html: loginNotificationTemplate(firstName, deviceInfo),
    });
  }

  /**
   * Send account locked notification
   */
  static async sendAccountLockedNotification(
    email: string,
    firstName: string,
    reason: string,
    unlockTime: Date
  ): Promise<void> {
    const unlockTimeStr = unlockTime.toLocaleString();

    await sendEmail({
      to: email,
      subject: 'Your account has been locked',
      html: `
        <p>Hi ${firstName},</p>
        <p>Your account has been locked due to: <strong>${reason}</strong></p>
        <p>Your account will be automatically unlocked at: <strong>${unlockTimeStr}</strong></p>
        <p>If you believe this is a mistake, please contact our support team.</p>
      `,
    });
  }

  /**
   * Send account unlock notification
   */
  static async sendAccountUnlockedNotification(
    email: string,
    firstName: string
  ): Promise<void> {
    await sendEmail({
      to: email,
      subject: 'Your account has been unlocked',
      html: `
        <p>Hi ${firstName},</p>
        <p>Your account has been unlocked and you can now login again.</p>
        <p>If you did not request this action, please secure your account immediately.</p>
      `,
    });
  }

  /**
   * Send suspicious activity alert
   */
  static async sendSuspiciousActivityAlert(
    email: string,
    firstName: string,
    activityType: string,
    ipAddress?: string
  ): Promise<void> {
    await sendEmail({
      to: email,
      subject: 'Suspicious activity detected on your account',
      html: `
        <p>Hi ${firstName},</p>
        <p>We detected suspicious activity on your account:</p>
        <p><strong>Activity:</strong> ${activityType}</p>
        ${ipAddress ? `<p><strong>IP Address:</strong> ${ipAddress}</p>` : ''}
        <p>If this was you, you can ignore this message.</p>
        <p>If you don't recognize this activity, please change your password immediately and review your account security settings.</p>
      `,
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default EmailService;
