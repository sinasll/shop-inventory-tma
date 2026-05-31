import type { InventoryBatch, Product } from '@prisma/client';
import {
  classifyExpiry,
  daysToExpiry,
  urgencyRank,
  type BatchGroup,
  type ExpiryStatus,
  type InventoryBatch as InventoryBatchDTO,
  type ProductDetail,
  type ProductSummary,
} from '@inv/shared';

const decToNum = (d: { toNumber: () => number } | null): number | null =>
  d == null ? null : d.toNumber();

const dateISO = (d: Date | null): string | null => (d ? d.toISOString() : null);

export interface ProductWithBatches extends Product {
  batches: InventoryBatch[];
}

export function summarize(
  product: ProductWithBatches,
  warningDays: number,
  now: Date = new Date(),
): ProductSummary & { _urgency: number } {
  const live = product.batches.filter((b) => b.quantity > 0);
  const totalQuantity = live.reduce((sum, b) => sum + b.quantity, 0);

  // Earliest expiry among live batches that have a date.
  const dated = live
    .filter((b) => b.expiryDate)
    .sort((a, b) => a.expiryDate!.getTime() - b.expiryDate!.getTime());
  const earliest = dated[0]?.expiryDate ?? null;

  const status: ExpiryStatus = earliest
    ? classifyExpiry(earliest, warningDays, now)
    : 'no_expiry';
  const dte = daysToExpiry(earliest, now);

  return {
    id: product.id,
    barcode: product.barcode,
    name: product.name,
    category: product.category,
    imageUrl: product.imageUrl,
    totalQuantity,
    earliestExpiry: dateISO(earliest),
    expiryStatus: status,
    isFavorite: product.isFavorite,
    updatedAt: product.updatedAt.toISOString(),
    _urgency: urgencyRank(status, dte),
  };
}

export function toBatchDTO(
  b: InventoryBatch,
  warningDays: number,
  now: Date = new Date(),
): InventoryBatchDTO {
  return {
    id: b.id,
    productId: b.productId,
    quantity: b.quantity,
    initialQuantity: b.initialQuantity,
    expiryDate: dateISO(b.expiryDate),
    expiryStatus: classifyExpiry(b.expiryDate, warningDays, now),
    costPrice: decToNum(b.costPrice),
    note: b.note,
    createdAt: b.createdAt.toISOString(),
  };
}

/** Group live batches by expiry date and combine quantities. */
export function groupBatches(
  batches: InventoryBatch[],
  warningDays: number,
  now: Date = new Date(),
): BatchGroup[] {
  const map = new Map<string, BatchGroup>();
  for (const b of batches) {
    if (b.quantity <= 0) continue;
    const key = b.expiryDate ? b.expiryDate.toISOString().slice(0, 10) : 'none';
    const existing = map.get(key);
    if (existing) {
      existing.quantity += b.quantity;
      existing.batchIds.push(b.id);
    } else {
      map.set(key, {
        expiryDate: b.expiryDate ? b.expiryDate.toISOString() : null,
        quantity: b.quantity,
        expiryStatus: classifyExpiry(b.expiryDate, warningDays, now),
        batchIds: [b.id],
      });
    }
  }
  // Sort groups: expired first, then soonest expiry, no-expiry last.
  return [...map.values()].sort((a, b) => {
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });
}

export function detail(
  product: ProductWithBatches,
  warningDays: number,
  now: Date = new Date(),
): ProductDetail {
  const base = summarize(product, warningDays, now);
  const { _urgency, ...summary } = base;
  void _urgency;
  return {
    ...summary,
    costPrice: decToNum(product.costPrice),
    sellPrice: decToNum(product.sellPrice),
    note: product.note,
    createdAt: product.createdAt.toISOString(),
    batches: product.batches
      .filter((b) => b.quantity > 0)
      .map((b) => toBatchDTO(b, warningDays, now)),
    groupedBatches: groupBatches(product.batches, warningDays, now),
  };
}
