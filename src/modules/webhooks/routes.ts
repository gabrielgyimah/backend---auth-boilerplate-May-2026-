/**
 * Webhook Routes
 * Endpoints for receiving external webhook events
 */

import { Router } from 'express';
import { webhookController } from './webhook.controller';

const router = Router();

// ============================================================================
// SENDGRID WEBHOOK
// ============================================================================

/**
 * POST /webhooks/sendgrid
 * Receive SendGrid delivery events (bounces, complaints, etc.)
 *
 * Configure this URL in SendGrid:
 * 1. Go to Settings → Mail Send Settings → Event Webhook
 * 2. Enter URL: https://yourdomain.com/api/v1/webhooks/sendgrid
 * 3. Select events: Bounces, Complaints, Unsubscribes, Delivered
 */
router.post('/sendgrid', (req, res, next) => {
  webhookController.handleSendGridEvent(req, res, next);
});

/**
 * GET /webhooks/sendgrid/stats
 * Get email reputation statistics
 */
router.get('/sendgrid/stats', (req, res, next) => {
  webhookController.getReputationStats(req, res, next);
});

export default router;
