/**
 * Email Template Management System
 * Centralized template configuration for all email types
 *
 * Supports:
 * - SendGrid Dynamic Templates (recommended for production)
 * - Fallback inline templates for development
 * - Type-safe template configuration
 */

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export enum EmailTemplateType {
  VERIFICATION = 'verification',
  EMAIL_VERIFIED = 'email_verified',
  LOGIN_OTP = 'login_otp',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGED = 'password_changed',
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  LOGIN_NOTIFICATION = 'login_notification',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

// ============================================================================
// TEMPLATE CONFIGURATION
// ============================================================================

export interface TemplateConfig {
  type: EmailTemplateType;
  sendgridTemplateId: string;
  name: string;
  description: string;
  category: string;
  requiredVariables: string[];
}

/**
 * Production SendGrid Template Configuration
 * Update these template IDs with your actual SendGrid template IDs
 *
 * To create templates in SendGrid:
 * 1. Go to https://app.sendgrid.com/dynamic_templates
 * 2. Create new template
 * 3. Add version with handlebars syntax: {{variableName}}
 * 4. Copy template ID and paste below
 */
export const TEMPLATE_CONFIG: Record<EmailTemplateType, TemplateConfig> = {
  [EmailTemplateType.VERIFICATION]: {
    type: EmailTemplateType.VERIFICATION,
    sendgridTemplateId: process.env.SENDGRID_TEMPLATE_VERIFICATION || 'd-verification-template-id',
    name: 'Email Verification',
    description: 'New user email verification',
    category: 'auth',
    requiredVariables: ['firstName', 'verificationUrl'],
  },
  [EmailTemplateType.EMAIL_VERIFIED]: {
    type: EmailTemplateType.EMAIL_VERIFIED,
    sendgridTemplateId: process.env.SENDGRID_TEMPLATE_EMAIL_VERIFIED || 'd-verified-template-id',
    name: 'Email Verified',
    description: 'Email verification success notification',
    category: 'auth',
    requiredVariables: ['firstName'],
  },
  [EmailTemplateType.LOGIN_OTP]: {
    type: EmailTemplateType.LOGIN_OTP,
    sendgridTemplateId: process.env.SENDGRID_TEMPLATE_LOGIN_OTP || 'd-otp-template-id',
    name: 'Login OTP',
    description: 'Two-factor authentication code',
    category: 'auth',
    requiredVariables: ['firstName', 'otpCode'],
  },
  [EmailTemplateType.PASSWORD_RESET]: {
    type: EmailTemplateType.PASSWORD_RESET,
    sendgridTemplateId: process.env.SENDGRID_TEMPLATE_PASSWORD_RESET || 'd-reset-template-id',
    name: 'Password Reset',
    description: 'Password reset request with token',
    category: 'auth',
    requiredVariables: ['firstName', 'resetUrl'],
  },
  [EmailTemplateType.PASSWORD_CHANGED]: {
    type: EmailTemplateType.PASSWORD_CHANGED,
    sendgridTemplateId: process.env.SENDGRID_TEMPLATE_PASSWORD_CHANGED || 'd-changed-template-id',
    name: 'Password Changed',
    description: 'Password change confirmation',
    category: 'auth',
    requiredVariables: ['firstName'],
  },
  [EmailTemplateType.TWO_FACTOR_ENABLED]: {
    type: EmailTemplateType.TWO_FACTOR_ENABLED,
    sendgridTemplateId: process.env.SENDGRID_TEMPLATE_2FA_ENABLED || 'd-2fa-template-id',
    name: 'Two-Factor Enabled',
    description: '2FA activation confirmation',
    category: 'auth',
    requiredVariables: ['firstName'],
  },
  [EmailTemplateType.LOGIN_NOTIFICATION]: {
    type: EmailTemplateType.LOGIN_NOTIFICATION,
    sendgridTemplateId: process.env.SENDGRID_TEMPLATE_LOGIN_NOTIFICATION || 'd-login-notif-template-id',
    name: 'Login Notification',
    description: 'New login detected alert',
    category: 'security',
    requiredVariables: ['firstName', 'deviceName', 'ipAddress', 'timestamp'],
  },
  [EmailTemplateType.ACCOUNT_LOCKED]: {
    type: EmailTemplateType.ACCOUNT_LOCKED,
    sendgridTemplateId: process.env.SENDGRID_TEMPLATE_ACCOUNT_LOCKED || 'd-locked-template-id',
    name: 'Account Locked',
    description: 'Account lock notification',
    category: 'security',
    requiredVariables: ['firstName', 'reason', 'unlockTime'],
  },
  [EmailTemplateType.ACCOUNT_UNLOCKED]: {
    type: EmailTemplateType.ACCOUNT_UNLOCKED,
    sendgridTemplateId: process.env.SENDGRID_TEMPLATE_ACCOUNT_UNLOCKED || 'd-unlocked-template-id',
    name: 'Account Unlocked',
    description: 'Account unlock notification',
    category: 'security',
    requiredVariables: ['firstName'],
  },
  [EmailTemplateType.SUSPICIOUS_ACTIVITY]: {
    type: EmailTemplateType.SUSPICIOUS_ACTIVITY,
    sendgridTemplateId: process.env.SENDGRID_TEMPLATE_SUSPICIOUS_ACTIVITY || 'd-suspicious-template-id',
    name: 'Suspicious Activity',
    description: 'Suspicious activity alert',
    category: 'security',
    requiredVariables: ['firstName', 'activityType', 'ipAddress'],
  },
};

// ============================================================================
// TEMPLATE SERVICE
// ============================================================================

export class EmailTemplateService {
  /**
   * Get template configuration by type
   */
  static getTemplate(type: EmailTemplateType): TemplateConfig {
    const template = TEMPLATE_CONFIG[type];
    if (!template) {
      throw new Error(`Unknown email template type: ${type}`);
    }
    return template;
  }

  /**
   * Get SendGrid template ID
   */
  static getTemplateId(type: EmailTemplateType): string {
    return this.getTemplate(type).sendgridTemplateId;
  }

  /**
   * Validate template data has required variables
   */
  static validateTemplateData(type: EmailTemplateType, data: Record<string, any>): boolean {
    const template = this.getTemplate(type);
    return template.requiredVariables.every((variable) => variable in data);
  }

  /**
   * Get all available templates
   */
  static getAllTemplates(): TemplateConfig[] {
    return Object.values(TEMPLATE_CONFIG);
  }

  /**
   * Get templates by category
   */
  static getTemplatesByCategory(category: string): TemplateConfig[] {
    return this.getAllTemplates().filter((t) => t.category === category);
  }
}

export default EmailTemplateService;
