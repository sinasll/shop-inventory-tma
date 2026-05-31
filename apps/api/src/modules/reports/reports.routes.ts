import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import type { StockMovement } from '@inv/shared';

export const reportsRouter: Router = Router();
reportsRouter.use(requireAuth);

const historyQuery = z.object({
  productId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

/** GET /reports/movements — stock movement / scan / batch history. */
reportsRouter.get(
  '/movements',
  asyncHandler(async (req, res) => {
    const q = historyQuery.parse(req.query);
    const ownerId = req.account!.telegramId;
    const where = { ownerId, ...(q.productId ? { productId: q.productId } : {}) };

    const [rows, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    const items: StockMovement[] = rows.map((m) => ({
      id: m.id,
      productId: m.productId,
      productName: m.product.name,
      batchId: m.batchId,
      type: m.type,
      quantity: m.quantity,
      note: m.note,
      createdAt: m.createdAt.toISOString(),
    }));

    res.json({
      items,
      total,
      page: q.page,
      pageSize: q.pageSize,
      hasMore: q.page * q.pageSize < total,
    });
  }),
);

/** GET /reports/expiry — products grouped by expiry risk (export-ready). */
reportsRouter.get(
  '/expiry',
  asyncHandler(async (req, res) => {
    const ownerId = req.account!.telegramId;
    const warningDays = req.account!.expiryWarningDays;
    const now = new Date();
    const soon = new Date(now.getTime() + warningDays * 86400000);

    const [expired, expiringSoon] = await Promise.all([
      prisma.inventoryBatch.findMany({
        where: { ownerId, quantity: { gt: 0 }, expiryDate: { lt: now } },
        include: { product: { select: { name: true, barcode: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.inventoryBatch.findMany({
        where: { ownerId, quantity: { gt: 0 }, expiryDate: { gte: now, lte: soon } },
        include: { product: { select: { name: true, barcode: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
    ]);

    const shape = (b: (typeof expired)[number]) => ({
      productId: b.productId,
      name: b.product.name,
      barcode: b.product.barcode,
      quantity: b.quantity,
      expiryDate: b.expiryDate?.toISOString() ?? null,
    });

    res.json({
      generatedAt: now.toISOString(),
      warningDays,
      expired: expired.map(shape),
      expiringSoon: expiringSoon.map(shape),
    });
  }),
);
