import type { WhitelistedUser } from '@prisma/client';
import {
  classifyExpiry,
  createTranslator,
  daysToExpiry,
  type Locale,
} from '@inv/shared';
import { prisma } from '../../lib/prisma.js';
import { sendTelegramMessage } from '../../lib/telegram-bot.js';
import { logger } from '../../config/logger.js';

interface ExpiryItem {
  name: string;
  quantity: number;
  daysLeft: number | null;
}

/**
 * Build the localized daily report text for one shop. Returns null when
 * there is nothing relevant to send (and the user has alerts on but a
 * clean inventory) — we still send an "all good" line so the user knows
 * the system is alive only when they have products.
 */
export async function buildDailyMessage(
  user: WhitelistedUser,
): Promise<string | null> {
  const t = createTranslator(user.locale as Locale);
  const now = new Date();
  const warningDays = user.expiryWarningDays;

  const batches = await prisma.inventoryBatch.findMany({
    where: { ownerId: user.telegramId, quantity: { gt: 0 } },
    include: { product: { select: { name: true } } },
  });

  const expired: ExpiryItem[] = [];
  const expiringSoon: ExpiryItem[] = [];

  for (const b of batches) {
    if (!b.expiryDate) continue;
    const status = classifyExpiry(b.expiryDate, warningDays, now);
    const dl = daysToExpiry(b.expiryDate, now);
    const item: ExpiryItem = { name: b.product.name, quantity: b.quantity, daysLeft: dl };
    if (status === 'expired') expired.push(item);
    else if (status === 'expiring_soon') expiringSoon.push(item);
  }

  // Low-stock per product (sum live quantities).
  let lowStock: ExpiryItem[] = [];
  if (user.lowStockAlertsEnabled) {
    const grouped = new Map<string, number>();
    for (const b of batches) {
      grouped.set(b.product.name, (grouped.get(b.product.name) ?? 0) + b.quantity);
    }
    lowStock = [...grouped.entries()]
      .filter(([, qty]) => qty > 0 && qty <= user.lowStockThreshold)
      .map(([name, qty]) => ({ name, quantity: qty, daysLeft: null }));
  }

  const wantsExpiry = user.expiryAlertsEnabled;
  const hasContent =
    (wantsExpiry && (expired.length > 0 || expiringSoon.length > 0)) ||
    (user.lowStockAlertsEnabled && lowStock.length > 0);

  if (!hasContent) {
    // Only ping "all good" if they have products at all.
    if (batches.length === 0) return null;
    return [t('notify.daily.greeting', { shop: user.shopName }), '', t('notify.daily.allGood')].join(
      '\n',
    );
  }

  const lines: string[] = [t('notify.daily.greeting', { shop: user.shopName }), ''];
  const unit = t('common.units');

  if (wantsExpiry && expired.length > 0) {
    lines.push(t('notify.daily.expired', { count: expired.length }));
    for (const it of expired.slice(0, 10)) {
      lines.push(
        t('notify.daily.item', {
          name: it.name,
          qty: it.quantity,
          unit,
          detail: t('status.expiredAgo', { days: Math.abs(it.daysLeft ?? 0) }),
        }),
      );
    }
    lines.push('');
  }

  if (wantsExpiry && expiringSoon.length > 0) {
    lines.push(t('notify.daily.expiringSoon', { count: expiringSoon.length, days: warningDays }));
    for (const it of expiringSoon.slice(0, 10)) {
      lines.push(
        t('notify.daily.item', {
          name: it.name,
          qty: it.quantity,
          unit,
          detail:
            it.daysLeft === 0
              ? t('status.expiresToday')
              : t('status.expiresIn', { days: it.daysLeft ?? 0 }),
        }),
      );
    }
    lines.push('');
  }

  if (user.lowStockAlertsEnabled && lowStock.length > 0) {
    lines.push(t('notify.daily.lowStock', { count: lowStock.length }));
    for (const it of lowStock.slice(0, 10)) {
      lines.push(
        t('notify.daily.item', { name: it.name, qty: it.quantity, unit, detail: '' }).replace(
          ' ()',
          '',
        ),
      );
    }
    lines.push('');
  }

  lines.push(t('notify.daily.footer'));
  return lines.join('\n').trim();
}

/**
 * Send (and log) the daily report for one user. Idempotent per day via
 * the NotificationLog unique constraint. Returns true if a message was
 * actually delivered.
 */
export async function sendDailyForUser(
  user: WhitelistedUser,
  dateKey: string,
): Promise<boolean> {
  // Skip if already sent today.
  const already = await prisma.notificationLog.findUnique({
    where: { owner_kind_date: { ownerId: user.telegramId, kind: 'daily', sentForDate: dateKey } },
  });
  if (already?.success) return false;

  const message = await buildDailyMessage(user);
  if (!message) return false;

  const result = await sendTelegramMessage(user.telegramId, message);

  await prisma.notificationLog.upsert({
    where: { owner_kind_date: { ownerId: user.telegramId, kind: 'daily', sentForDate: dateKey } },
    create: {
      ownerId: user.telegramId,
      kind: 'daily',
      sentForDate: dateKey,
      success: result.ok,
      detail: result.error ?? null,
    },
    update: { success: result.ok, detail: result.error ?? null },
  });

  if (!result.ok) logger.warn({ user: user.telegramId, error: result.error }, 'daily notify failed');
  return result.ok;
}

/** Send a localized test notification (used by admin / settings). */
export async function sendTestNotification(user: WhitelistedUser): Promise<boolean> {
  const t = createTranslator(user.locale as Locale);
  const result = await sendTelegramMessage(
    user.telegramId,
    t('notify.test.message', { shop: user.shopName }),
  );
  return result.ok;
}
