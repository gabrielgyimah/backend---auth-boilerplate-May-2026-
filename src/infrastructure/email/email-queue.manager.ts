/**
 * Email Queue Manager Service
 * Async email queuing system replacing synchronous email sending
 *
 * Features:
 * - Queue emails for background processing
 * - Priority-based job handling
 * - Scheduled email delivery
 * - Type-safe queue operations
 */

import { getQueue } from '@/infrastructure/queue/queue';
import { EMAIL_QUEUE_NAME, EmailJobData, EMAIL_JOB_TYPES, getJobPriority } from '@/infrastructure/queue/email.queue';
import { EmailTemplateType } from '@/infrastructure/email/templates/template-config';
import logger from '@/infrastructure/database/logger';
import { EmailEventType } from '@generated/prisma/edge';

// ============================================================================
// EMAIL QUEUE MANAGER
// ============================================================================

export class EmailQueueManager {
  private static queue = getQueue<EmailJobData>(EMAIL_QUEUE_NAME);

  /**
   * Queue email verification email
   */
  static async queueVerificationEmail(
    email: string,
    firstName: string,
    verificationUrl: string,
    userId: string
  ): Promise<void> {
    await this.queue.add(EMAIL_JOB_TYPES.VERIFICATION, {
      to: email,
      templateType: EmailTemplateType.VERIFICATION,
      templateData: {
        firstName,
        verificationUrl,
      },
      userId,
      eventType: EmailEventType.VERIFICATION,
      priority: 'normal',
    });

    logger.debug('[Email Queue] Verification email queued', { email, userId });
  }

  /**
   * Queue email verified notification
   */
  static async queueEmailVerifiedNotification(
    email: string,
    firstName: string,
    userId: string
  ): Promise<void> {
    await this.queue.add(EMAIL_JOB_TYPES.EMAIL_VERIFIED, {
      to: email,
      templateType: EmailTemplateType.EMAIL_VERIFIED,
      templateData: { firstName },
      userId,
      eventType: EmailEventType.EMAIL_VERIFIED,
      priority: 'normal',
    });

    logger.debug('[Email Queue] Email verified notification queued', { email, userId });
  }

  /**
   * Queue login OTP email
   */
  static async queueLoginOtp(
    email: string,
    firstName: string,
    otpCode: string,
    userId: string
  ): Promise<void> {
    await this.queue.add(
      EMAIL_JOB_TYPES.LOGIN_OTP,
      {
        to: email,
        templateType: EmailTemplateType.LOGIN_OTP,
        templateData: {
          firstName,
          otpCode,
        },
        userId,
        eventType: EmailEventType.LOGIN_OTP,
        priority: 'high',
      },
      {
        priority: getJobPriority(EMAIL_JOB_TYPES.LOGIN_OTP),
      }
    );

    logger.debug('[Email Queue] Login OTP queued', { email, userId });
  }

  /**
   * Queue password reset email
   */
  static async queuePasswordResetEmail(
    email: string,
    firstName: string,
    resetUrl: string,
    userId: string
  ): Promise<void> {
    await this.queue.add(EMAIL_JOB_TYPES.PASSWORD_RESET, {
      to: email,
      templateType: EmailTemplateType.PASSWORD_RESET,
      templateData: {
        firstName,
        resetUrl,
      },
      userId,
      eventType: EmailEventType.PASSWORD_RESET,
      priority: 'high',
    });

    logger.debug('[Email Queue] Password reset email queued', { email, userId });
  }

  /**
   * Queue password changed notification
   */
  static async queuePasswordChangedNotification(
    email: string,
    firstName: string,
    userId: string
  ): Promise<void> {
    await this.queue.add(EMAIL_JOB_TYPES.PASSWORD_CHANGED, {
      to: email,
      templateType: EmailTemplateType.PASSWORD_CHANGED,
      templateData: { firstName },
      userId,
      eventType: EmailEventType.PASSWORD_CHANGED,
      priority: 'normal',
    });

    logger.debug('[Email Queue] Password changed notification queued', { email, userId });
  }

  /**
   * Queue 2FA enabled notification
   */
  static async queueTwoFactorEnabledNotification(
    email: string,
    firstName: string,
    userId: string
  ): Promise<void> {
    await this.queue.add(EMAIL_JOB_TYPES.TWO_FACTOR_ENABLED, {
      to: email,
      templateType: EmailTemplateType.TWO_FACTOR_ENABLED,
      templateData: { firstName },
      userId,
      eventType: EmailEventType.TWO_FACTOR_ENABLED,
      priority: 'normal',
    });

    logger.debug('[Email Queue] 2FA enabled notification queued', { email, userId });
  }

  /**
   * Queue login notification
   */
  static async queueLoginNotification(
    email: string,
    firstName: string,
    deviceInfo: {
      name: string;
      type: string;
      ipAddress?: string;
      userAgent?: string;
    },
    userId: string
  ): Promise<void> {
    await this.queue.add(EMAIL_JOB_TYPES.LOGIN_NOTIFICATION, {
      to: email,
      templateType: EmailTemplateType.LOGIN_NOTIFICATION,
      templateData: {
        firstName,
        deviceName: deviceInfo.name,
        deviceType: deviceInfo.type,
        ipAddress: deviceInfo.ipAddress || 'unknown',
        userAgent: deviceInfo.userAgent || 'unknown',
        timestamp: new Date().toLocaleString(),
      },
      userId,
      eventType: EmailEventType.LOGIN_NOTIFICATION,
      priority: 'normal',
    });

    logger.debug('[Email Queue] Login notification queued', { email, userId });
  }

  /**
   * Queue account locked notification
   */
  static async queueAccountLockedNotification(
    email: string,
    firstName: string,
    reason: string,
    unlockTime: Date,
    userId: string
  ): Promise<void> {
    await this.queue.add(
      EMAIL_JOB_TYPES.ACCOUNT_LOCKED,
      {
        to: email,
        templateType: EmailTemplateType.ACCOUNT_LOCKED,
        templateData: {
          firstName,
          reason,
          unlockTime: unlockTime.toLocaleString(),
        },
        userId,
        eventType: EmailEventType.ACCOUNT_LOCKED,
        priority: 'high',
      },
      {
        priority: getJobPriority(EMAIL_JOB_TYPES.ACCOUNT_LOCKED),
      }
    );

    logger.debug('[Email Queue] Account locked notification queued', { email, userId });
  }

  /**
   * Queue account unlocked notification
   */
  static async queueAccountUnlockedNotification(
    email: string,
    firstName: string,
    userId: string
  ): Promise<void> {
    await this.queue.add(EMAIL_JOB_TYPES.ACCOUNT_UNLOCKED, {
      to: email,
      templateType: EmailTemplateType.ACCOUNT_UNLOCKED,
      templateData: { firstName },
      userId,
      eventType: EmailEventType.ACCOUNT_UNLOCKED,
      priority: 'normal',
    });

    logger.debug('[Email Queue] Account unlocked notification queued', { email, userId });
  }

  /**
   * Queue suspicious activity alert
   */
  static async queueSuspiciousActivityAlert(
    email: string,
    firstName: string,
    activityType: string,
    ipAddress: string | undefined,
    userId: string
  ): Promise<void> {
    await this.queue.add(
      EMAIL_JOB_TYPES.SUSPICIOUS_ACTIVITY,
      {
        to: email,
        templateType: EmailTemplateType.SUSPICIOUS_ACTIVITY,
        templateData: {
          firstName,
          activityType,
          ipAddress: ipAddress || 'unknown',
        },
        userId,
        eventType: EmailEventType.SUSPICIOUS_ACTIVITY,
        priority: 'high',
      },
      {
        priority: getJobPriority(EMAIL_JOB_TYPES.SUSPICIOUS_ACTIVITY),
      }
    );

    logger.debug('[Email Queue] Suspicious activity alert queued', { email, userId });
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<{
    waitingCount: number;
    activeCount: number;
    completedCount: number;
    failedCount: number;
  }> {
    return {
      waitingCount: await this.queue.getWaitingCount(),
      activeCount: await this.queue.getActiveCount(),
      completedCount: await this.queue.getCompletedCount(),
      failedCount: await this.queue.getFailedCount(),
    };
  }

  /**
   * Get queue health status
   */
  static async getQueueHealth(): Promise<{
    healthy: boolean;
    stats: any;
  }> {
    const stats = await this.getQueueStats();
    const total = stats.waitingCount + stats.activeCount + stats.completedCount + stats.failedCount;
    const failureRate = total > 0 ? stats.failedCount / total : 0;

    return {
      healthy: failureRate < 0.1, // Less than 10% failure rate
      stats,
    };
  }
}

export default EmailQueueManager;
