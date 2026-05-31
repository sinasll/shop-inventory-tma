import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import type {
  AddBatchInput,
  CreateProductInput,
  MovementInput,
  UpdateProductInput,
} from '@inv/shared';
import { detail, type ProductWithBatches } from './product.mapper.js';

const includeBatches = { batches: { orderBy: { expiryDate: 'asc' } } } as const;

/** Fetch a product strictly scoped to its owner (shop isolation). */
async function getOwnedProduct(ownerId: string, productId: string): Promise<ProductWithBatches> {
  const product = await prisma.product.findFirst({
    where: { id: productId, ownerId },
    include: includeBatches,
  });
  if (!product) throw HttpError.notFound('product_not_found');
  return product as ProductWithBatches;
}

export async function findByBarcode(ownerId: string, barcode: string, warningDays: number) {
  const product = await prisma.product.findUnique({
    where: { owner_barcode: { ownerId, barcode } },
    include: includeBatches,
  });
  if (!product) return null;
  return detail(product as ProductWithBatches, warningDays);
}

export async function getProduct(ownerId: string, productId: string, warningDays: number) {
  const product = await getOwnedProduct(ownerId, productId);
  return detail(product, warningDays);
}

export async function createProduct(
  ownerId: string,
  input: CreateProductInput,
  warningDays: number,
) {
  const existing = await prisma.product.findUnique({
    where: { owner_barcode: { ownerId, barcode: input.barcode } },
  });
  if (existing) throw HttpError.conflict('barcode_exists');

  const product = await prisma.product.create({
    data: {
      ownerId,
      barcode: input.barcode,
      name: input.name,
      category: input.category ?? null,
      costPrice: input.costPrice ?? null,
      sellPrice: input.sellPrice ?? null,
      note: input.note ?? null,
      lastScannedAt: new Date(),
    },
    include: includeBatches,
  });
  return detail(product as ProductWithBatches, warningDays);
}

export async function updateProduct(
  ownerId: string,
  productId: string,
  input: UpdateProductInput,
  warningDays: number,
) {
  await getOwnedProduct(ownerId, productId);
  const data: Prisma.ProductUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.category !== undefined) data.category = input.category;
  if (input.costPrice !== undefined) data.costPrice = input.costPrice;
  if (input.sellPrice !== undefined) data.sellPrice = input.sellPrice;
  if (input.note !== undefined) data.note = input.note;
  if (input.isFavorite !== undefined) data.isFavorite = input.isFavorite;

  const product = await prisma.product.update({
    where: { id: productId },
    data,
    include: includeBatches,
  });
  return detail(product as ProductWithBatches, warningDays);
}

export async function markScanned(ownerId: string, productId: string) {
  await getOwnedProduct(ownerId, productId);
  await prisma.product.update({
    where: { id: productId },
    data: { lastScannedAt: new Date() },
  });
}

/** Add a new stock batch (a delivery) + record an `added` movement. */
export async function addBatch(
  ownerId: string,
  productId: string,
  input: AddBatchInput,
  warningDays: number,
) {
  await getOwnedProduct(ownerId, productId);

  await prisma.$transaction(async (tx) => {
    const batch = await tx.inventoryBatch.create({
      data: {
        ownerId,
        productId,
        quantity: input.quantity,
        initialQuantity: input.quantity,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        costPrice: input.costPrice ?? null,
        note: input.note ?? null,
      },
    });
    await tx.stockMovement.create({
      data: {
        ownerId,
        productId,
        batchId: batch.id,
        type: 'added',
        quantity: input.quantity,
        note: input.note ?? null,
      },
    });
    await tx.product.update({
      where: { id: productId },
      data: { lastScannedAt: new Date() },
    });
  });

  return getProduct(ownerId, productId, warningDays);
}

/**
 * Record stock leaving inventory (sold/discarded/damaged/returned/removed).
 * Consumes from the supplied batch, or — if none given — from the
 * soonest-expiring batches first (FEFO: first-expired-first-out), which
 * is exactly what loss-prevention requires.
 */
export async function recordMovement(
  ownerId: string,
  productId: string,
  input: MovementInput,
  warningDays: number,
) {
  await getOwnedProduct(ownerId, productId);

  await prisma.$transaction(async (tx) => {
    let remaining = input.quantity;

    const batches = input.batchId
      ? await tx.inventoryBatch.findMany({
          where: { id: input.batchId, ownerId, productId, quantity: { gt: 0 } },
        })
      : await tx.inventoryBatch.findMany({
          where: { ownerId, productId, quantity: { gt: 0 } },
          orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
        });

    const available = batches.reduce((s, b) => s + b.quantity, 0);
    if (available < remaining) throw HttpError.badRequest('insufficient_stock');

    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(batch.quantity, remaining);
      await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: { quantity: { decrement: take } },
      });
      await tx.stockMovement.create({
        data: {
          ownerId,
          productId,
          batchId: batch.id,
          type: input.type,
          quantity: take,
          note: input.note ?? null,
        },
      });
      remaining -= take;
    }
  });

  return getProduct(ownerId, productId, warningDays);
}

export async function deleteProduct(ownerId: string, productId: string) {
  await getOwnedProduct(ownerId, productId);
  // Cascade deletes batches & movements via schema relations.
  await prisma.product.delete({ where: { id: productId } });
}
