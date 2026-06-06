/**
 * Email Queue Jobs
 * Job definitions and types for email processing via BullMQ
 */

import { EmailEventType } from "@generated/prisma/edge";
import { EmailTemplateType } from "../email";


// ============================================================================
// EMAIL JOB TYPES
// ============================================================================

export interface EmailJobData {
  to: string | string[];
  subject?: string;
  templateType?: EmailTemplateType;
  templateData?: Record<string, any>;
  html?: string;
  text?: string;
  categories?: string[];
  priority?: 'low' | 'normal' | 'high';
  scheduledFor?: Date;
  retryCount?: number;
  userId?: string;
  eventType?: EmailEventType;
}

export interface EmailJobResult {
  jobId: string;
  messageId: string;
  success: boolean;
  error?: string;
  attempts: number;
  createdAt: Date;
  completedAt?: Date;
}

// ============================================================================
// EMAIL QUEUE CONSTANTS
// ============================================================================

export const EMAIL_QUEUE_NAME = 'email';

export const EMAIL_JOB_TYPES = {
  VERIFICATION: 'verification',
  EMAIL_VERIFIED: 'email_verified',
  LOGIN_OTP: 'login_otp',
  PASSWORD_RESET: 'password_reset',
  PASSWORD_CHANGED: 'password_changed',
  TWO_FACTOR_ENABLED: 'two_factor_enabled',
  LOGIN_NOTIFICATION: 'login_notification',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_UNLOCKED: 'account_unlocked',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
} as const;

export type EmailJobType = typeof EMAIL_JOB_TYPES[keyof typeof EMAIL_JOB_TYPES];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get priority options based on job type
 */
export function getJobPriority(jobType: EmailJobType): number {
  const priorityMap: Record<EmailJobType, number> = {
    [EMAIL_JOB_TYPES.VERIFICATION]: 1,
    [EMAIL_JOB_TYPES.EMAIL_VERIFIED]: 2,
    [EMAIL_JOB_TYPES.LOGIN_OTP]: 0, // Highest priority - time sensitive
    [EMAIL_JOB_TYPES.PASSWORD_RESET]: 1,
    [EMAIL_JOB_TYPES.PASSWORD_CHANGED]: 2,
    [EMAIL_JOB_TYPES.TWO_FACTOR_ENABLED]: 2,
    [EMAIL_JOB_TYPES.LOGIN_NOTIFICATION]: 3,
    [EMAIL_JOB_TYPES.ACCOUNT_LOCKED]: 0, // High priority - security alert
    [EMAIL_JOB_TYPES.ACCOUNT_UNLOCKED]: 1,
    [EMAIL_JOB_TYPES.SUSPICIOUS_ACTIVITY]: 0, // High priority - security alert
  };

  return priorityMap[jobType] ?? 2;
}

export default {
  EMAIL_QUEUE_NAME,
  EMAIL_JOB_TYPES,
  getJobPriority,
};
