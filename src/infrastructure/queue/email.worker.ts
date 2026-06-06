/**
 * Email Queue Processor
 * Worker that processes email jobs from the queue
 *
 * Responsibilities:
 * - Dequeue email jobs
 * - Send via SendGrid
 * - Handle failures and retries
 * - Track delivery status
 * - Log events for monitoring
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection } from './queue';
import SendGridEmailClient from '@/infrastructure/email/clients/sendgrid.client';
import { EmailTemplateService, EmailTemplateType } from '@/infrastructure/email/templates/template-config';
import logger from '@/infrastructure/database/logger';
import { db } from '@/infrastructure/database/prisma';
import { EMAIL_QUEUE_NAME, EmailJobData, EmailJobResult } from './email.queue';
import { EmailEventType } from '@generated/prisma';

// ============================================================================
// EMAIL WORKER
// ============================================================================

export class EmailQueueWorker {
  private worker: Worker | null = null;

  /**
   * Start the email queue worker
   */
  async start(): Promise<void> {
    try {
      this.worker = new Worker<EmailJobData, EmailJobResult>(
        EMAIL_QUEUE_NAME,
        async (job) => {
          return this.processEmailJob(job);
        },
        {
          connection: getRedisConnection(),
          concurrency: 10, // Process up to 10 emails simultaneously
          lockDuration: 30000, // Hold lock for 30 seconds
          lockRenewTime: 15000, // Renew lock every 15 seconds
        }
      );

      // Event handlers
      this.worker.on('completed', (job, result) => {
        logger.info('[Email Worker] Job completed', {
          jobId: job.id,
          name: job.name,
          messageId: result.messageId,
        });
      });

      this.worker.on('failed', (job, error) => {
        logger.error('[Email Worker] Job failed', {
          jobId: job?.id,
          name: job?.name,
          error: error.message,
          attempts: job?.attemptsMade,
        });
      });

      this.worker.on('error', (error) => {
        logger.error('[Email Worker] Worker error', { error: error.message });
      });

      logger.info('[Email Worker] Email queue worker started');
    } catch (error) {
      logger.error('[Email Worker] Failed to start worker', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Process individual email job
   */
  private async processEmailJob(job: Job<EmailJobData>): Promise<EmailJobResult> {
    const jobId = job.id || 'unknown';
    const createdAt = new Date();

    try {
      const { to, subject, templateType, templateData, html, userId, eventType } = job.data;

      logger.debug('[Email Worker] Processing email job', {
        jobId,
        to,
        templateType,
      });

      let result;

      // Send using SendGrid template
      if (templateType && templateData) {
        const template = EmailTemplateService.getTemplate(templateType as EmailTemplateType);
        
        // Validate template data
        if (!EmailTemplateService.validateTemplateData(templateType as EmailTemplateType, templateData)) {
          throw new Error(
            `Missing required template variables for ${templateType}. Required: ${template.requiredVariables.join(', ')}`
          );
        }

        result = await SendGridEmailClient.sendWithTemplate(to as string, template.sendgridTemplateId, templateData, {
          categories: [template.category, eventType || 'unknown'],
          customArgs: userId ? { userId } : undefined,
        });
      } else if (html || subject) {
        // Send with inline HTML
        result = await SendGridEmailClient.send({
          to,
          subject: subject || 'Notification',
          html,
        });
      } else {
        throw new Error('Either template or HTML content must be provided');
      }

      const completedAt = new Date();

      // Log email sent to database if userId provided
      if (userId && result.success) {
        try {
          await db.emailLog.create({
            data: {
              userId,
              recipient: typeof to === 'string' ? to : to[0],
              subject: subject || templateType || 'Notification',
              messageId: result.messageId,
              eventType: eventType as EmailEventType || templateType,
              status: 'SENT',
              sentAt: completedAt,
            },
          });
        } catch (dbError) {
          logger.warn('[Email Worker] Failed to log email to database', {
            userId,
            error: dbError instanceof Error ? dbError.message : String(dbError),
          });
        }
      }

      return {
        jobId,
        messageId: result.messageId || 'unknown',
        success: result.success,
        error: result.error,
        attempts: job.attemptsMade,
        createdAt,
        completedAt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('[Email Worker] Error processing email job', {
        jobId,
        error: errorMessage,
        attempts: job.attemptsMade,
      });

      // Log failed email to database
      if (job.data.userId) {
        try {
          await db.emailLog.create({
            data: {
              userId: job.data.userId,
              recipient: typeof job.data.to === 'string' ? job.data.to : job.data.to[0],
              subject: job.data.subject || job.data.templateType || 'Notification',
              messageId: `failed-${jobId}`,
              eventType: job.data.eventType as EmailEventType || job.data.templateType,
              status: 'FAILED',
              error: errorMessage,
              sentAt: new Date(),
            },
          });
        } catch (dbError) {
          logger.warn('[Email Worker] Failed to log email failure', {
            error: dbError instanceof Error ? dbError.message : String(dbError),
          });
        }
      }

      throw error; // Re-throw to trigger BullMQ retry logic
    }
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      logger.info('[Email Worker] Email queue worker stopped');
    }
  }

  /**
   * Get worker status
   */
  async getStatus(): Promise<{
    isRunning: boolean;
    isPaused: boolean;
    stats?: any;
  }> {
    if (!this.worker) {
      return { isRunning: false, isPaused: false };
    }

    return {
      isRunning: true,
      isPaused: await this.worker.isPaused(),
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let emailWorkerInstance: EmailQueueWorker | null = null;

export function getEmailWorker(): EmailQueueWorker {
  if (!emailWorkerInstance) {
    emailWorkerInstance = new EmailQueueWorker();
  }
  return emailWorkerInstance;
}

export default EmailQueueWorker;
