/**
 * SendGrid Webhook Handler Service
 * Processes delivery events from SendGrid for reputation management
 *
 * Events handled:
 * - Hard bounces (invalid/non-existent emails)
 * - Soft bounces (temporary delivery issues)
 * - Spam complaints
 * - Unsubscribes
 * - Click/open events
 * * Security Fix Applied:
 * - IMPLEMENTED REDLOCK: Webhook providers guarantee "at-least-once" delivery.
 * Wrapped processEvent in a distributed lock keyed by sg_event_id to prevent 
 * duplicate concurrent processing across scaled containers.
 */

import { db } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/database/logger';
import { config } from '@/config';
import { lockManager } from '@/infrastructure/lock/redlock'; // Adjust path based on your setup

// ============================================================================
// TYPES
// ============================================================================

export interface SendGridEvent {
  email: string;
  timestamp: number;
  smtpid?: string;
  event: 'bounce' | 'complaint' | 'unsubscribe' | 'click' | 'open' | 'delivered' | 'processed';
  'bounce_type'?: 'permanent' | 'temporary';
  reason?: string;
  status?: string;
  sg_message_id?: string;
  sg_event_id?: string;
}

export interface BounceEvent extends SendGridEvent {
  event: 'bounce';
  bounce_type: 'permanent' | 'temporary';
  reason: string;
}

export interface ComplaintEvent extends SendGridEvent {
  event: 'complaint';
}

// ============================================================================
// WEBHOOK SERVICE
// ============================================================================

export class SendGridWebhookService {
  /**
   * Process SendGrid webhook events safely with Distributed Locking
   */
  static async processEvent(event: SendGridEvent): Promise<void> {
    // 1. Establish a unique Resource Key
    // SendGrid provides sg_event_id for deduplication. Fallback to a composite key if missing.
    const eventId = event.sg_event_id || `${event.email}-${event.timestamp}-${event.event}`;
    const resourceKey = `locks:webhook:sendgrid:${eventId}`;
    const ttl = config.REDLOCK_TTL || 10000; // Lock TTL in milliseconds (e.g., 10 seconds)

    let lock;

    try {
      // 2. Acquire the distributed lock
      // If another container is currently processing this exact event, this will throw an ExecutionError
      lock = await lockManager.acquire([resourceKey], ttl);

      // 3. Process the event payload
      switch (event.event) {
        case 'bounce':
          await this.handleBounce(event as BounceEvent);
          break;
        case 'complaint':
          await this.handleComplaint(event as ComplaintEvent);
          break;
        case 'unsubscribe':
          await this.handleUnsubscribe(event);
          break;
        case 'delivered':
          await this.handleDelivered(event);
          break;
        case 'open':
        case 'click':
          logger.debug('[Webhook] Engagement event received', {
            event: event.event,
            email: event.email,
          });
          break;
        default:
          logger.debug('[Webhook] Unknown event type', { event: event.event });
      }
    } catch (error: any) {
      // 4. Handle Lock Failures Gracefully
      // If the error comes from Redlock, it simply means another container handled this webhook duplicate.
      if (error.name === 'ExecutionError') {
        logger.debug('[Webhook] Duplicate event safely dropped by Redlock', { eventId, type: event.event });
        return; 
      }

      // Handle standard application errors
      logger.error('[Webhook] Error processing event', {
        email: event.email,
        event: event.event,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      // 5. Always release the lock in the finally block
      if (lock) {
        try {
          await lock.release();
        } catch (releaseError) {
          // Log but do not crash; lock may have naturally expired if processing took longer than 10s
          logger.debug('[Webhook] Lock release skipped (likely expired)', { eventId });
        }
      }
    }
  }

  /**
   * Handle bounce events
   * Hard bounces indicate invalid addresses
   */
  private static async handleBounce(event: BounceEvent): Promise<void> {
    const { email, bounce_type, reason } = event;

    logger.info('[Webhook] Bounce event received', {
      email,
      type: bounce_type,
      reason,
    });

    if (bounce_type === 'permanent') {
      try {
        await db.user.updateMany({
          where: { email: email.toLowerCase() },
          data: {
            isEmailInvalid: true,
            emailInvalidReason: `Hard bounce: ${reason}`,
            emailInvalidatedAt: new Date(),
          },
        });

        logger.info('[Webhook] User email marked as invalid', { email, reason });
      } catch (error) {
        logger.error('[Webhook] Failed to mark email as invalid', {
          email,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else if (bounce_type === 'temporary') {
      try {
        await db.emailBounce.create({
          data: {
            email: email.toLowerCase(),
            bounceType: 'temporary',
            reason,
            occurredAt: new Date(event.timestamp * 1000),
          },
        });

        logger.debug('[Webhook] Temporary bounce logged', { email });
      } catch (error) {
        logger.warn('[Webhook] Failed to log temporary bounce', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Handle complaint events
   * User reported email as spam
   */
  private static async handleComplaint(event: ComplaintEvent): Promise<void> {
    const { email } = event;

    logger.warn('[Webhook] Complaint event received', { email });

    try {
      await db.$transaction([
        db.user.updateMany({
          where: { email: email.toLowerCase() },
          data: {
            isEmailComplained: true,
            emailComplainedAt: new Date(),
          },
        }),
        db.emailComplaint.create({
          data: {
            email: email.toLowerCase(),
            occurredAt: new Date(event.timestamp * 1000),
            reason: 'User marked as spam',
          },
        })
      ]);

      logger.info('[Webhook] Email complaint recorded', { email });
      logger.warn('[Webhook] All emails to this address should be halted', { email });
    } catch (error) {
      logger.error('[Webhook] Failed to process complaint', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle unsubscribe events
   */
  private static async handleUnsubscribe(event: SendGridEvent): Promise<void> {
    const { email } = event;

    logger.info('[Webhook] Unsubscribe event received', { email });

    try {
      await db.user.updateMany({
        where: { email: email.toLowerCase() },
        data: {
          isUnsubscribed: true,
          unsubscribedAt: new Date(),
        },
      });

      logger.info('[Webhook] User marked as unsubscribed', { email });
    } catch (error) {
      logger.error('[Webhook] Failed to process unsubscribe', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle delivered events
   */
  private static async handleDelivered(event: SendGridEvent): Promise<void> {
    const { email } = event;

    logger.debug('[Webhook] Delivered event received', { email });

    try {
      await db.emailLog.updateMany({
        where: {
          recipient: email.toLowerCase(),
          status: 'SENT',
        },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(event.timestamp * 1000),
        },
      });
    } catch (error) {
      logger.warn('[Webhook] Failed to update delivery status', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Validate webhook signature from SendGrid
   */
  static validateWebhookSignature(
    payload: string,
    signature: string,
    timestamp: string
  ): boolean {
    const crypto = require('crypto');
    const verificationKey = process.env.SENDGRID_WEBHOOK_KEY;

    if (!verificationKey) {
      logger.warn('[Webhook] SENDGRID_WEBHOOK_KEY not configured - signature validation disabled');
      return false;
    }

    const signed_content = timestamp + payload;
    const hash = crypto
      .createHmac('sha256', verificationKey)
      .update(signed_content)
      .digest('base64');

    return hash === signature;
  }

  /**
   * Get bounce and complaint statistics
   */
  static async getReputationStats(): Promise<{
    totalBounces: number;
    permanentBounces: number;
    temporaryBounces: number;
    totalComplaints: number;
    invalidEmails: number;
    unsubscribedCount: number;
  }> {
    try {
      const bounces = await db.emailBounce.groupBy({
        by: ['bounceType'],
        _count: true,
      });

      const complaints = await db.emailComplaint.count();
      const invalidEmails = await db.user.count({
        where: { isEmailInvalid: true },
      });
      const unsubscribed = await db.user.count({
        where: { isUnsubscribed: true },
      });

      const permanentBounces = bounces.find((b) => b.bounceType === 'permanent')?._count || 0;
      const temporaryBounces = bounces.find((b) => b.bounceType === 'temporary')?._count || 0;

      return {
        totalBounces: permanentBounces + temporaryBounces,
        permanentBounces,
        temporaryBounces,
        totalComplaints: complaints,
        invalidEmails,
        unsubscribedCount: unsubscribed,
      };
    } catch (error) {
      logger.error('[Webhook] Failed to get reputation stats', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        totalBounces: 0,
        permanentBounces: 0,
        temporaryBounces: 0,
        totalComplaints: 0,
        invalidEmails: 0,
        unsubscribedCount: 0,
      };
    }
  }
}

export default SendGridWebhookService;