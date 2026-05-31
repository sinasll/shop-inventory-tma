import type { WhitelistedUser } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

/**
 * Recompute the subscription status from `activeUntil` and persist it if
 * it drifted (e.g. expired since last login). Disabled accounts stay
 * disabled regardless of date.
 */
export async function ensureSubscriptionFresh(
  account: WhitelistedUser,
): Promise<WhitelistedUser> {
  if (account.status === 'disabled') return account;

  const now = new Date();
  const isActive = account.activeUntil != null && account.activeUntil.getTime() > now.getTime();
  const computed = isActive ? 'active' : 'expired';

  if (computed === account.status) return account;

  return prisma.whitelistedUser.update({
    where: { telegramId: account.telegramId },
    data: { status: computed },
  });
}
