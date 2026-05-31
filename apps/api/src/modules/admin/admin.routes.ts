import { Router } from 'express';
import {
  adminCreateUserSchema,
  adminListQuerySchema,
  adminUpdateUserSchema,
  telegramIdSchema,
} from '@inv/shared';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import { adminRateLimiter } from '../../middleware/rate-limit.js';
import { sendTestNotification } from '../notifications/notification.service.js';
import { toUserProfile } from '../auth/auth.mapper.js';
import * as service from './admin.service.js';

export const adminRouter: Router = Router();

/**
 * Admin routes accept EITHER an authenticated admin Telegram user OR a
 * machine token. `requireAuth` is "soft" here: token-only callers skip it.
 */
const softAuth = asyncHandler(async (req, res, next) => {
  if (req.header('x-admin-token')) return next();
  return requireAuth(req, res, next);
});

adminRouter.use(adminRateLimiter);
adminRouter.use(softAuth);
adminRouter.use(requireAdmin);

const adminId = (req: { account?: { telegramId: string } }) =>
  req.account?.telegramId ?? 'machine-token';

/** GET /admin/users — search + paginate. */
adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const query = adminListQuerySchema.parse(req.query);
    res.json(await service.listUsers(query));
  }),
);

/** GET /admin/users/:id */
adminRouter.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const id = telegramIdSchema.parse(req.params.id);
    res.json({ profile: toUserProfile(await service.getUser(id)) });
  }),
);

/** POST /admin/users — whitelist a new user. */
adminRouter.post(
  '/users',
  asyncHandler(async (req, res) => {
    const input = adminCreateUserSchema.parse(req.body);
    const user = await service.createUser(adminId(req), input);
    res.status(201).json({ profile: toUserProfile(user) });
  }),
);

/** PATCH /admin/users/:id — extend / disable / edit / change settings. */
adminRouter.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const id = telegramIdSchema.parse(req.params.id);
    const input = adminUpdateUserSchema.parse(req.body);
    const user = await service.updateUser(adminId(req), id, input);
    res.json({ profile: toUserProfile(user) });
  }),
);

/** POST /admin/users/:id/test-notification — send a localized test ping. */
adminRouter.post(
  '/users/:id/test-notification',
  asyncHandler(async (req, res) => {
    const id = telegramIdSchema.parse(req.params.id);
    const user = await service.getUser(id);
    const ok = await sendTestNotification(user);
    res.json({ ok });
  }),
);
