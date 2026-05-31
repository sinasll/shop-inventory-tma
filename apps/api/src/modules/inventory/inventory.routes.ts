import { Router } from 'express';
import { inventoryQuerySchema } from '@inv/shared';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';
import { listInventory } from './inventory.service.js';

export const inventoryRouter: Router = Router();
inventoryRouter.use(requireAuth);

/** GET /inventory — search / filter / sort / paginate products. */
inventoryRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = inventoryQuerySchema.parse(req.query);
    const account = req.account!;
    const result = await listInventory(
      account.telegramId,
      query,
      account.expiryWarningDays,
      account.lowStockThreshold,
    );
    res.json(result);
  }),
);
