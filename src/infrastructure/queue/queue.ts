/**
 * Queue Infrastructure
 * Centralized message queue management using BullMQ
 *
 * Provides:
 * - Queue creation and management
 * - Connection pooling
 * - Queue event handlers
 */

import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '@/config';
import logger from '@/infrastructure/database/logger';

// ============================================================================
// REDIS CONNECTION
// ============================================================================

// BullMQ requires ioredis, so we pass your Cloud Redis credentials here directly
const redisConfig = {
  host: config.CLOUD_REDIS_HOST,
  port: Number(config.CLOUD_REDIS_PORT) || 6379,
  username: config.CLOUD_REDIS_USERNAME || undefined, // Cloud Redis often requires username
  password: config.CLOUD_REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Critical requirement for BullMQ
  enableReadyCheck: false,
  // If your Cloud Redis provider requires TLS (common for managed services like Upstash, AWS ElastiCache, Redis Enterprise):
  // tls: {}, 
};

let redisConnection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(redisConfig);

    redisConnection.on('connect', () => {
      logger.info('[Queue] Cloud Redis connection established');
    });

    redisConnection.on('error', (err) => {
      logger.error('[Queue] Cloud Redis connection error:', err);
    });

    redisConnection.on('close', () => {
      logger.warn('[Queue] Cloud Redis connection closed');
    });
  }

  return redisConnection;
}

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

const queues = new Map<string, Queue>();

/**
 * Get or create a queue with the given name
 */
export function getQueue<T = any>(
  queueName: string,
  options?: Partial<QueueOptions>
): Queue<T> {
  if (queues.has(queueName)) {
    return queues.get(queueName) as Queue<T>;
  }

  const queue = new Queue<T>(queueName, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
    ...options,
  });

  queue.on('error', (err) => {
    logger.error(`[Queue] ${queueName} error:`, err);
  });

  queues.set(queueName, queue);

  logger.info(`[Queue] Queue created: ${queueName}`);

  return queue;
}

/**
 * Close all queues and Redis connection
 */
export async function closeAllQueues(): Promise<void> {
  const closePromises = Array.from(queues.values()).map((queue) =>
    queue.close().catch((err) => logger.error('[Queue] Error closing queue:', err))
  );

  await Promise.all(closePromises);
  queues.clear();

  if (redisConnection) {
    await redisConnection.quit().catch((err) => logger.error('[Queue] Error closing Redis connection:', err));
    redisConnection = null;
  }

  logger.info('[Queue] All queues closed');
}

/**
 * Graceful shutdown handler
 */
export async function gracefulQueueShutdown(): Promise<void> {
  try {
    await closeAllQueues();
  } catch (error) {
    logger.error('[Queue] Error during graceful shutdown:', error);
  }
}

export default {
  getQueue,
  getRedisConnection,
  closeAllQueues,
  gracefulQueueShutdown,
};