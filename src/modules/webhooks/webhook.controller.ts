/**
 * SendGrid Webhook Controller
 * Handles incoming webhook events from SendGrid
 */

import { Request, Response, NextFunction } from 'express';
import SendGridWebhookService from '@/modules/webhooks/sendgrid-webhook.service';
import logger from '@/infrastructure/database/logger';

export class WebhookController {
  /**
   * Handle SendGrid webhook events
   * POST /webhooks/sendgrid
   */
  async handleSendGridEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Verify webhook signature
      const signature = req.headers['x-twilio-email-event-webhook-signature'] as string;
      const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] as string;

      if (signature && timestamp) {
        const rawBody = JSON.stringify(req.body);
        const isValid = SendGridWebhookService.validateWebhookSignature(rawBody, signature, timestamp);

        if (!isValid) {
          logger.warn('[Webhook] Invalid signature received');
          res.status(401).json({ success: false, message: 'Invalid signature' });
          return;
        }
      }

      // Process events
      const events = Array.isArray(req.body) ? req.body : [req.body];

      for (const event of events) {
        void SendGridWebhookService.processEvent(event);
      }

      logger.debug('[Webhook] Events queued for processing', { count: events.length });

      res.status(200).json({ success: true, processed: events.length });
    } catch (error) {
      logger.error('[Webhook] Error handling SendGrid event', {
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }

  /**
   * Get reputation statistics
   * GET /webhooks/sendgrid/stats
   */
  async getReputationStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await SendGridWebhookService.getReputationStats();

      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[Webhook] Error getting reputation stats', {
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
}

export const webhookController = new WebhookController();
