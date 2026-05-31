import { Router } from 'express';
import { updateSettingsSchema } from '@inv/shared';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { toUserProfile } from '../auth/auth.mapper.js';

export const settingsRouter: Router = Router();
settingsRouter.use(requireAuth);

/**
 * PATCH /settings — update language and/or preferences. Returns the full
 * refreshed profile so the client can apply changes instantly (no reload).
 */
settingsRouter.patch(
  '/',
  asyncHandler(async (req, res) => {
    const input = updateSettingsSchema.parse(req.body);
    const ownerId = req.account!.telegramId;

    const updated = await prisma.whitelistedUser.update({
      where: { telegramId: ownerId },
      data: {
        ...(input.locale !== undefined ? { locale: input.locale } : {}),
        ...(input.notificationsEnabled !== undefined
          ? { notificationsEnabled: input.notificationsEnabled }
          : {}),
        ...(input.expiryAlertsEnabled !== undefined
          ? { expiryAlertsEnabled: input.expiryAlertsEnabled }
          : {}),
        ...(input.lowStockAlertsEnabled !== undefined
          ? { lowStockAlertsEnabled: input.lowStockAlertsEnabled }
          : {}),
        ...(input.dailyAlertTime !== undefined ? { dailyAlertTime: input.dailyAlertTime } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.expiryWarningDays !== undefined
          ? { expiryWarningDays: input.expiryWarningDays }
          : {}),
        ...(input.lowStockThreshold !== undefined
          ? { lowStockThreshold: input.lowStockThreshold }
          : {}),
        ...(input.scannerSound !== undefined ? { scannerSound: input.scannerSound } : {}),
        ...(input.scannerVibration !== undefined
          ? { scannerVibration: input.scannerVibration }
          : {}),
        ...(input.preferRearCamera !== undefined
          ? { preferRearCamera: input.preferRearCamera }
          : {}),
        ...(input.offlineCacheEnabled !== undefined
          ? { offlineCacheEnabled: input.offlineCacheEnabled }
          : {}),
      },
    });

    res.json({ profile: toUserProfile(updated) });
  }),
);
