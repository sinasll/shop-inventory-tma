import { PrismaClient } from '@prisma/client';
import { isProd } from '../config/env.js';

/**
 * Prisma singleton. In dev with tsx-watch the module can re-evaluate;
 * we stash the client on globalThis to avoid exhausting Neon's
 * connection pool with hot reloads.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!isProd) globalForPrisma.prisma = prisma;
