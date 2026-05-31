import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { InventoryQuery, Paginated, ProductSummary } from '@inv/shared';
import { summarize, type ProductWithBatches } from '../products/product.mapper.js';

/**
 * Inventory listing with search, filter, sort & pagination.
 *
 * Strategy for free-tier performance: we filter & search in the DB to
 * keep the candidate set small, then compute expiry status / urgency in
 * memory (since it depends on per-user warningDays and "now"). Pagination
 * for urgency/quantity sorts is applied after in-memory ranking; for
 * name/recent we can let the DB sort & page directly.
 */
export async function listInventory(
  ownerId: string,
  query: InventoryQuery,
  warningDays: number,
  lowStockThreshold: number,
): Promise<Paginated<ProductSummary>> {
  const now = new Date();
  const where: Prisma.ProductWhereInput = { ownerId };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { barcode: { contains: query.search, mode: 'insensitive' } },
      { category: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.filter === 'favorites') where.isFavorite = true;

  const dbSortable = query.sort === 'name' || query.sort === 'recent';

  // Fetch candidates (with batches) — only what we need.
  const products = (await prisma.product.findMany({
    where,
    include: { batches: true },
    orderBy:
      query.sort === 'name'
        ? { name: 'asc' }
        : query.sort === 'recent'
          ? { updatedAt: 'desc' }
          : { updatedAt: 'desc' },
  })) as ProductWithBatches[];

  let summaries = products.map((p) => summarize(p, warningDays, now));

  // Status / low-stock filters (depend on computed status).
  summaries = summaries.filter((s) => {
    switch (query.filter) {
      case 'expired':
        return s.expiryStatus === 'expired';
      case 'expiring_soon':
        return s.expiryStatus === 'expiring_soon';
      case 'safe':
        return s.expiryStatus === 'safe';
      case 'low_stock':
        return s.totalQuantity > 0 && s.totalQuantity <= lowStockThreshold;
      default:
        return true;
    }
  });

  // Sorting.
  if (query.sort === 'urgency') {
    summaries.sort((a, b) => a._urgency - b._urgency);
  } else if (query.sort === 'quantity') {
    summaries.sort((a, b) => b.totalQuantity - a.totalQuantity);
  }
  // name/recent already ordered by DB; keep as-is.
  void dbSortable;

  const total = summaries.length;
  const start = (query.page - 1) * query.pageSize;
  const pageItems = summaries.slice(start, start + query.pageSize).map(stripUrgency);

  return {
    items: pageItems,
    total,
    page: query.page,
    pageSize: query.pageSize,
    hasMore: start + query.pageSize < total,
  };
}

function stripUrgency(s: ProductSummary & { _urgency: number }): ProductSummary {
  const { _urgency, ...rest } = s;
  void _urgency;
  return rest;
}
