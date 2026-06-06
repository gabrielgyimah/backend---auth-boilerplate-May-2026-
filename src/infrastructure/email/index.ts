/**
 * Email Infrastructure
 * Exports all email-related modules and services
 */

// Legacy exports (deprecated, use EmailQueueManager instead)
export { EmailService, default } from './email.service';
export * from './templates';

// New async queue-based system
export { EmailQueueManager, default as EmailQueueManagerDefault } from './email-queue.manager';
export { SendGridEmailClient } from './clients/sendgrid.client';
export { EmailTemplateService, EmailTemplateType } from './templates/template-config';
export type { EmailPayload, SendEmailResult } from './clients/sendgrid.client';
export type { TemplateConfig } from './templates/template-config';
