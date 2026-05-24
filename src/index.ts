/**
 * Application Entry Point
 * Initializes the server and manages lifecycle
 */

import { config } from '@/config';
import { createApp } from '@/app';
import { db } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/database/logger';

const PORT = config.PORT;
const HOST = config.HOST;

async function start(): Promise<void> {
  try {
    // Initialize Express app
    const app = createApp();

    // Test database connection
    logger.info('Testing database connection...');
    await db.$queryRaw`SELECT 1`;
    logger.info('Database connection successful');

    // Start server
    const server = app.listen(PORT, HOST, () => {
      logger.info({
        msg: 'Server started',
        host: HOST,
        port: PORT,
        environment: config.NODE_ENV,
        apiUrl: config.API_URL,
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // Disconnect database
        await db.$disconnect();
        logger.info('Database connection closed');

        logger.info('Application shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error({
        msg: 'Uncaught Exception',
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error({
        msg: 'Unhandled Rejection',
        reason,
        promise: String(promise),
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error({
      msg: 'Failed to start application',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start application
start();
