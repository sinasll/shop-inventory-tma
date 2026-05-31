import { Router } from 'express';
import {
  addBatchSchema,
  barcodeSchema,
  createProductSchema,
  movementSchema,
  updateProductSchema,
} from '@inv/shared';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';
import { HttpError } from '../../lib/http-error.js';
import * as service from './product.service.js';

export const productRouter: Router = Router();
productRouter.use(requireAuth);

const warnDays = (req: { account?: { expiryWarningDays: number } }) =>
  req.account?.expiryWarningDays ?? 7;

/** GET /products/lookup?barcode=... — fast scan resolution. */
productRouter.get(
  '/lookup',
  asyncHandler(async (req, res) => {
    const barcode = barcodeSchema.parse(req.query.barcode);
    const product = await service.findByBarcode(req.account!.telegramId, barcode, warnDays(req));
    res.json({ found: product != null, product });
  }),
);

/** GET /products/:id — full product detail with grouped batches. */
productRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await service.getProduct(req.account!.telegramId, req.params.id!, warnDays(req));
    res.json({ product });
  }),
);

/** POST /products — create a brand-new product. */
productRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createProductSchema.parse(req.body);
    const product = await service.createProduct(req.account!.telegramId, input, warnDays(req));
    res.status(201).json({ product });
  }),
);

/** PATCH /products/:id — edit metadata / toggle favorite. */
productRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = updateProductSchema.parse(req.body);
    const product = await service.updateProduct(
      req.account!.telegramId,
      req.params.id!,
      input,
      warnDays(req),
    );
    res.json({ product });
  }),
);

/** POST /products/:id/batches — add a stock delivery (fast-entry flow). */
productRouter.post(
  '/:id/batches',
  asyncHandler(async (req, res) => {
    const input = addBatchSchema.parse(req.body);
    const product = await service.addBatch(
      req.account!.telegramId,
      req.params.id!,
      input,
      warnDays(req),
    );
    res.status(201).json({ product });
  }),
);

/** POST /products/:id/movements — sold/discarded/damaged/returned/removed. */
productRouter.post(
  '/:id/movements',
  asyncHandler(async (req, res) => {
    const input = movementSchema.parse(req.body);
    const product = await service.recordMovement(
      req.account!.telegramId,
      req.params.id!,
      input,
      warnDays(req),
    );
    res.json({ product });
  }),
);

/** DELETE /products/:id — remove product + all stock (confirmed client-side). */
productRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await service.deleteProduct(req.account!.telegramId, req.params.id!);
    res.json({ ok: true });
  }),
);

// Guard against missing id param edge case.
productRouter.use((req, _res, next) => {
  if (req.path === '/' && req.method === 'GET') next(HttpError.notFound());
  else next();
});
