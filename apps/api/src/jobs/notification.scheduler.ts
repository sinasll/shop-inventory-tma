import cron, { type ScheduledTask } from 'node-cron';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { prisma } from '../lib/prisma.js';
import { getLocalTimeParts } from '../lib/timezone.js';
import { sendDailyForUser } from '../modules/notifications/notification.service.js';

let task: ScheduledTask | null = null;
let running = false;

/**
 * Ticks every minute. For each active, notifications-enabled user whose
 * local wall-clock time equals their configured dailyAlertTime, send the
 * localized daily report. Per-shop isolation is guaranteed because every
 * query in the pipeline filters by ownerId.
 */
async function tick(): Promise<void> {
  if (running) return; // prevent overlap on slow ticks
  running = true;
  try {
    const now = new Date();

    const candidates = await prisma.whitelistedUser.findMany({
      where: {
        status: 'active',
        notificationsEnabled: true,
        activeUntil: { gt: now },
        OR: [{ expiryAlertsEnabled: true }, { lowStockAlertsEnabled: true }],
      },
    });

    let sent = 0;
    for (const user of candidates) {
      const { hhmm, dateKey } = getLocalTimeParts(user.timezone, now);
      if (hhmm !== user.dailyAlertTime) continue;
      try {
        const delivered = await sendDailyForUser(user, dateKey);
        if (delivered) sent += 1;
      } catch (err) {
        logger.error({ err, user: user.telegramId }, 'notify dispatch error');
      }
    }

    if (sent > 0) logger.info({ sent }, 'daily notifications dispatched');
  } catch (err) {
    logger.error({ err }, 'scheduler tick failed');
  } finally {
    running = false;
  }
}

export function startNotificationScheduler(): void {
  if (task) return;
  if (!cron.validate(env.NOTIFY_CRON)) {
    logger.error({ cron: env.NOTIFY_CRON }, 'invalid NOTIFY_CRON expression');
    return;
  }
  task = cron.schedule(env.NOTIFY_CRON, () => void tick(), { timezone: 'UTC' });
  logger.info({ cron: env.NOTIFY_CRON }, 'notification scheduler started');
}

export function stopNotificationScheduler(): void {
  task?.stop();
  task = null;
}
