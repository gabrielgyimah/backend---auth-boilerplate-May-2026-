/**
 * Webhooks Module Exports
 */

export { SendGridWebhookService } from './sendgrid-webhook.service';
export { webhookController } from './webhook.controller';
export type { SendGridEvent, BounceEvent, ComplaintEvent } from './sendgrid-webhook.service';
