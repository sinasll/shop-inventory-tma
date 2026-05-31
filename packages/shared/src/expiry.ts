import type { ExpiryStatus } from './types/index.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole-day difference between two dates (UTC, ignoring time-of-day). */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * Classify an expiry date into a health bucket.
 * Shared by the dashboard, inventory list, and notification engine so
 * the color coding is consistent everywhere.
 */
export function classifyExpiry(
  expiryDate: Date | string | null | undefined,
  warningDays: number,
  now: Date = new Date(),
): ExpiryStatus {
  if (!expiryDate) return 'no_expiry';
  const exp = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  if (Number.isNaN(exp.getTime())) return 'no_expiry';
  const days = daysBetween(now, exp);
  if (days < 0) return 'expired';
  if (days <= warningDays) return 'expiring_soon';
  return 'safe';
}

/** Numeric urgency rank — lower = more urgent. Drives smart sorting. */
export function urgencyRank(status: ExpiryStatus, daysToExpiry: number | null): number {
  switch (status) {
    case 'expired':
      // Most expired (most negative days) first.
      return -1_000_000 + (daysToExpiry ?? 0);
    case 'expiring_soon':
      return daysToExpiry ?? 0;
    case 'safe':
      return 1_000_000 + (daysToExpiry ?? 0);
    case 'no_expiry':
    default:
      return 2_000_000;
  }
}

export function daysToExpiry(
  expiryDate: Date | string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!expiryDate) return null;
  const exp = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  if (Number.isNaN(exp.getTime())) return null;
  return daysBetween(now, exp);
}
