/**
 * Pino Logger Configuration
 * Structured logging for production-grade applications
 */

import pino from 'pino';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = process.env.LOG_DIR || './logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

// Configure transport based on environment
const transport = isDevelopment
  ? pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
        levelFirst: true,
      },
    })
  : undefined;

// Create logger instance
const logger = pino(
  {
    level: logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      env: process.env.NODE_ENV,
      version: process.env.npm_package_version,
    },
  },
  isDevelopment ? transport : pino.destination(path.join(logsDir, 'app.log'))
);

// Export logger instance
export default logger;

// Export utility functions
export const logRequest = (
  method: string,
  url: string,
  statusCode: number,
  duration: number
): void => {
  logger.info({
    msg: 'HTTP Request',
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
  });
};

export const logError = (
  error: Error,
  context?: Record<string, any>
): void => {
  logger.error({
    msg: error.message,
    stack: error.stack,
    ...context,
  });
};

export const logWarning = (
  message: string,
  context?: Record<string, any>
): void => {
  logger.warn({
    msg: message,
    ...context,
  });
};

export const logInfo = (
  message: string,
  context?: Record<string, any>
): void => {
  logger.info({
    msg: message,
    ...context,
  });
};

export const logDebug = (
  message: string,
  context?: Record<string, any>
): void => {
  logger.debug({
    msg: message,
    ...context,
  });
};
