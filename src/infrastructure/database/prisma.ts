/**
 * Prisma Database Client Initialization
 * Handles database connection and provides singleton instance
 */

import { PrismaClient } from '@generated/prisma/client';

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";


const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
export const db = new PrismaClient({ adapter });

