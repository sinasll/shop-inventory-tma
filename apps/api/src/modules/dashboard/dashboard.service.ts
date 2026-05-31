import { prisma } from '../../lib/prisma.js';
import type { DashboardResponse, DashboardStats, ProductSummary } from '@inv/shared';
import { summarize, type ProductWithBatches } from '../products/product.mapper.js';

/**
 * Builds the dashboard payload: aggregate health stats + urgency-sorted
 * critical list + recently scanned. All scoped to the owner.
 */
export async function buildDashboard(
  ownerId: string,
  warningDays: number,
  lowStockThreshold: number,
): Promise<DashboardResponse> {
  const now = new Date();

  const products = (await prisma.product.findMany({
    where: { ownerId },
    include: { batches: true },
  })) as ProductWithBatches[];

  const summaries = products.map((p) => summarize(p, warningDays, now));

  let totalUnits = 0;
  let totalBatches = 0;
  let expiredCount = 0;
  let expiringSoonCount = 0;
  let safeCount = 0;
  let lowStockCount = 0;
  let estimatedValue = 0;
  let hasAnyPrice = false;

  for (const p of products) {
    for (const b of p.batches) {
      if (b.quantity <= 0) continue;
      totalBatches += 1;
      totalUnits += b.quantity;
      const unitPrice = b.costPrice?.toNumber() ?? p.costPrice?.toNumber() ?? null;
      if (unitPrice != null) {
        estimatedValue += unitPrice * b.quantity;
        hasAnyPrice = true;
      }
    }
  }

  for (const s of summaries) {
    if (s.expiryStatus === 'expired') expiredCount += 1;
    else if (s.expiryStatus === 'expiring_soon') expiringSoonCount += 1;
    else if (s.expiryStatus === 'safe' || s.expiryStatus === 'no_expiry') safeCount += 1;
    if (s.totalQuantity > 0 && s.totalQuantity <= lowStockThreshold) lowStockCount += 1;
  }

  const stats: DashboardStats = {
    totalProducts: products.length,
    totalBatches,
    totalUnits,
    expiredCount,
    expiringSoonCount,
    safeCount,
    lowStockCount,
    estimatedStockValue: hasAnyPrice ? Math.round(estimatedValue * 100) / 100 : null,
  };

  // Critical = expired or expiring soon, urgency-sorted, top 30.
  const critical: ProductSummary[] = summaries
    .filter((s) => s.expiryStatus === 'expired' || s.expiryStatus === 'expiring_soon')
    .sort((a, b) => a._urgency - b._urgency)
    .slice(0, 30)
    .map(({ _urgency, ...rest }) => {
      void _urgency;
      return rest;
    });

  // Recently scanned = top 10 by lastScannedAt.
  const recentlyScanned: ProductSummary[] = products
    .filter((p) => p.lastScannedAt != null)
    .sort((a, b) => (b.lastScannedAt!.getTime() ?? 0) - (a.lastScannedAt!.getTime() ?? 0))
    .slice(0, 10)
    .map((p) => {
      const { _urgency, ...rest } = summarize(p, warningDays, now);
      void _urgency;
      return rest;
    });

  return { stats, critical, recentlyScanned, generatedAt: now.toISOString() };
}
