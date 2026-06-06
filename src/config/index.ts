/**
 * Application Configuration
 * Loads and validates environment variables
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({
  path: path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`),
});
dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

// ============================================================================
// ENVIRONMENT VARIABLES SCHEMA
// ============================================================================

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  API_URL: z.string().url().default(`http://localhost:${process.env.PORT || 3005}`),
  FRONTEND_URL: z.string().url().default(`http://localhost:${process.env.FRONTEND_PORT || 3000}`),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_URL_SHADOW: z.string().url().optional(),

  // JWT & Authentication
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRE: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_EXPIRE: z.string().default('7d'),
  JWT_ALGORITHM: z.enum(['HS256', 'HS512', 'RS256']).default('HS256'),

  // Password Policy
  PASSWORD_MIN_LENGTH: z.coerce.number().default(8),
  PASSWORD_MAX_LENGTH: z.coerce.number().default(128),
  PASSWORD_REQUIRE_UPPERCASE: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),
  PASSWORD_REQUIRE_LOWERCASE: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),
  PASSWORD_REQUIRE_NUMBERS: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),
  PASSWORD_REQUIRE_SPECIAL_CHARS: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),
  PASSWORD_EXPIRE_DAYS: z.coerce.number().default(90),
  PASSWORD_HISTORY_COUNT: z.coerce.number().default(5),

  // Account Security
  MAX_LOGIN_ATTEMPTS: z.coerce.number().default(5),
  LOGIN_ATTEMPT_WINDOW_MINUTES: z.coerce.number().default(15),
  ACCOUNT_LOCK_DURATION_MINUTES: z.coerce.number().default(30),
  SESSION_TIMEOUT_MINUTES: z.coerce.number().default(30),
  CONCURRENT_SESSION_LIMIT: z.coerce.number().default(5),

  // OTP & 2FA
  OTP_LENGTH: z.coerce.number().default(6),
  OTP_EXPIRY_MINUTES: z.coerce.number().default(5),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(3),
  TOTP_WINDOW: z.coerce.number().default(1),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_CACHE_TTL: z.coerce.number().default(3600),

  // Cloud Redis
  CLOUD_REDIS_HOST: z.string().optional(),
  CLOUD_REDIS_PORT: z.coerce.number().optional(),
  CLOUD_REDIS_USERNAME: z.string().optional(),
  CLOUD_REDIS_PASSWORD: z.string().optional(),
  CLOUD_REDIS_DB: z.coerce.number().optional(),
  CLOUD_REDIS_CACHE_TTL: z.coerce.number().default(3600),

  // Email (SMTP - legacy, use SendGrid instead)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().optional(),

  // SendGrid Configuration
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_WEBHOOK_KEY: z.string().optional(),
  SENDGRID_TEMPLATE_VERIFICATION: z.string().optional(),
  SENDGRID_TEMPLATE_EMAIL_VERIFIED: z.string().optional(),
  SENDGRID_TEMPLATE_LOGIN_OTP: z.string().optional(),
  SENDGRID_TEMPLATE_PASSWORD_RESET: z.string().optional(),
  SENDGRID_TEMPLATE_PASSWORD_CHANGED: z.string().optional(),
  SENDGRID_TEMPLATE_2FA_ENABLED: z.string().optional(),
  SENDGRID_TEMPLATE_LOGIN_NOTIFICATION: z.string().optional(),
  SENDGRID_TEMPLATE_ACCOUNT_LOCKED: z.string().optional(),
  SENDGRID_TEMPLATE_ACCOUNT_UNLOCKED: z.string().optional(),
  SENDGRID_TEMPLATE_SUSPICIOUS_ACTIVITY: z.string().optional(),

  // Logging
  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  LOG_DIR: z.string().default('./logs'),
  LOG_MAX_SIZE: z.string().default('10m'),
  LOG_MAX_FILES: z.string().default('14d'),

  // CORS
  CORS_ORIGIN: z
    .string()
    .transform((v) => v.split(',').map((origin) => origin.trim()))
    .default('http://localhost:3000'),
  CORS_CREDENTIALS: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().default(15),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_LOGIN_WINDOW_MINUTES: z.coerce.number().default(15),
  RATE_LIMIT_LOGIN_MAX_REQUESTS: z.coerce.number().default(5),

  // Feature Flags
  FEATURE_2FA: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),
  FEATURE_DEVICE_MANAGEMENT: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),
  FEATURE_SESSION_MANAGEMENT: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),
  FEATURE_AUDIT_LOGGING: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),

  // Security
  ENABLE_HTTPS: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  SECURE_COOKIES: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  SAME_SITE_COOKIES: z.enum(['Strict', 'Lax', 'None']).default('Lax'),
  ENABLE_CSRF: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),
  HELMET_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),

  // Monitoring
  ENABLE_METRICS: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  METRICS_PORT: z.coerce.number().default(9090),

  // Queue
  QUEUE_REDIS_HOST: z.string().default('localhost'),
  QUEUE_REDIS_PORT: z.coerce.number().default(6379),
  QUEUE_REDIS_PASSWORD: z.string().optional(),
});

type Config = z.infer<typeof envSchema>;

// Renamed from 'config' to 'cachedConfig' to avoid name collision
let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (!cachedConfig) {
    try {
      cachedConfig = envSchema.parse(process.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Environment variable validation error:');
        error.errors.forEach((err) => {
          console.error(`  ${err.path.join('.')}: ${err.message}`);
        });
      }
      throw new Error('Failed to validate environment variables');
    }
  }
  return cachedConfig;
}

// Now safely exports 'config' without namespace conflicts
export const config = getConfig();

export default config;