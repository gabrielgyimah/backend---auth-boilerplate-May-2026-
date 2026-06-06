/**
 * Prisma Database Client Initialization
 * Handles database connection, custom logger integration, and provides a singleton instance.
 */

import { PrismaClient } from '@generated/prisma'; // Note: Ensure this path matches your setup (e.g., @generated/prisma or @prisma/client)
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import logger from './logger';

// 1. Setup the database driver adapter
const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });

let prisma: PrismaClient;

declare global {
  var prisma: PrismaClient | undefined;
}

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    // 2. Initialize Prisma with BOTH the adapter and the log configurations
    prisma = new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' }, // Changes 'query' to an event emit so our listener can catch it
              { emit: 'stdout', level: 'error' },
              { emit: 'stdout', level: 'warn' },
            ]
          : [{ emit: 'stdout', level: 'error' }],
    });

    // 3. Add custom Pino event listener for development queries
    if (process.env.NODE_ENV === 'development') {
      (prisma as any).$on('query', (e: { query: string; duration: number }) => {
        logger.debug({
          msg: 'Database Query',
          query: e.query,
          duration: `${e.duration}ms`,
        });
      });
    }

    // Handle global caching for Next.js/Hot-reloading environments
    if (process.env.NODE_ENV !== 'production') {
      global.prisma = prisma;
    }
  }

  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

// Export default instance
export const db = getPrismaClient();