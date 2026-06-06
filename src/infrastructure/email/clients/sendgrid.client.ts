/**
 * SendGrid Email Client
 * Enterprise-grade ESP for reliable email delivery
 *
 * Benefits:
 * - Automatic bounce/complaint handling
 * - IP reputation management
 * - Webhook support for delivery tracking
 * - Template management
 * - Analytics and reporting
 */

import sgMail from '@sendgrid/mail';
import { config } from '@/config';
import logger from '@/infrastructure/database/logger';

// ============================================================================
// SENDGRID SETUP
// ============================================================================

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY && config.NODE_ENV === 'production') {
  throw new Error('[Email] SENDGRID_API_KEY is required for production');
}

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// ============================================================================
// TYPES
// ============================================================================

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  categories?: string[];
  customArgs?: Record<string, string>;
  sendAt?: number;
}

export interface SendEmailResult {
  messageId: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// EMAIL CLIENT
// ============================================================================

export class SendGridEmailClient {
  /**
   * Send email using SendGrid
   */
  static async send(payload: EmailPayload): Promise<SendEmailResult> {
    try {
      // If no API key, log instead of sending (for development)
      if (!SENDGRID_API_KEY) {
        logger.warn('[Email] SENDGRID_API_KEY not configured. Email not sent.', {
          to: payload.to,
          subject: payload.subject,
        });

        return {
          messageId: `dev-${Date.now()}`,
          success: false,
          error: 'SENDGRID_API_KEY not configured',
        };
      }

      // Use dynamic template if provided
      if (payload.templateId) {
        const mailPayload: sgMail.MailDataRequired = {
          to: payload.to,
          from: payload.from || config.SMTP_FROM || 'noreply@app.com',
          templateId: payload.templateId,
          dynamicTemplateData: payload.dynamicTemplateData || {},
          replyTo: payload.replyTo,
          categories: payload.categories,
          customArgs: payload.customArgs,
          sendAt: payload.sendAt,
        };

        // Build response with template
        const response = await sgMail.send(mailPayload);

        logger.debug('[Email] Email sent via SendGrid template', {
          messageId: response[0].headers['x-message-id'],
          to: payload.to,
          templateId: payload.templateId,
        });

        return {
          messageId: response[0].headers['x-message-id'] as string,
          success: true,
        };
      }

      // Use HTML/text content if no template
      const mailPayload: sgMail.MailDataRequired = {
        to: payload.to,
        from: payload.from || config.SMTP_FROM || 'noreply@app.com',
        subject: payload.subject,
        replyTo: payload.replyTo,
        categories: payload.categories,
        customArgs: payload.customArgs,
        sendAt: payload.sendAt,
        html: payload.html,
        text: payload.text,
        content: [{
            type: 'text/html',
            value: payload.html || payload.text || '',
        }],
      };

      if (payload.html) {
        mailPayload.html = payload.html;
      } else if (payload.text) {
        mailPayload.text = payload.text;
      } else {
        throw new Error('Either html, text, or templateId must be provided');
      }

      const response = await sgMail.send(mailPayload);

      logger.debug('[Email] Email sent via SendGrid', {
        messageId: response[0].headers['x-message-id'],
        to: payload.to,
        subject: payload.subject,
      });

      return {
        messageId: response[0].headers['x-message-id'] as string,
        success: true,
      };
    } catch (error) {

      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('[Email] Failed to send email via SendGrid', {
        to: payload.to,
        subject: payload.subject,
        error: errorMessage,
      });

      return {
        messageId: '',
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send batch of emails
   */
  static async sendBatch(payloads: EmailPayload[]): Promise<SendEmailResult[]> {
    const results = await Promise.all(payloads.map((payload) => this.send(payload)));
    return results;
  }

  /**
   * Send email using dynamic template
   */
  static async sendWithTemplate(
    to: string,
    templateId: string,
    dynamicData: Record<string, any>,
    options?: {
      categories?: string[];
      customArgs?: Record<string, string>;
    }
  ): Promise<SendEmailResult> {
    return this.send({
      to,
      subject: '', // Subject comes from template
      templateId,
      dynamicTemplateData: dynamicData,
      categories: options?.categories,
      customArgs: options?.customArgs,
    });
  }
}

export default SendGridEmailClient;
