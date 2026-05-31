import { Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';
import { buildDashboard } from './dashboard.service.js';

export const dashboardRouter: Router = Router();
dashboardRouter.use(requireAuth);

/** GET /dashboard — health stats + critical + recently scanned. */
dashboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const account = req.account!;
    const data = await buildDashboard(
      account.telegramId,
      account.expiryWarningDays,
      account.lowStockThreshold,
    );
    res.json(data);
  }),
);
