import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './lib/prisma.js';
import {
  startNotificationScheduler,
  stopNotificationScheduler,
} from './jobs/notification.scheduler.js';

async function main(): Promise<void> {
  // Verify DB connectivity before accepting traffic.
  await prisma.$connect();
  logger.info('database connected');

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'API listening');
  });

  startNotificationScheduler();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    stopNotificationScheduler();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'fatal startup error');
  process.exit(1);
});
