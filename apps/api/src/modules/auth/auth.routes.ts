import { Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';
import { toUserProfile } from './auth.mapper.js';
import { HttpError } from '../../lib/http-error.js';

export const authRouter: Router = Router();

/**
 * GET /auth/me — verify the caller and return the full profile + settings.
 * Front-end calls this on launch to load the user's stored language and
 * preferences.
 */
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.account) throw HttpError.unauthorized();
    res.json({ profile: toUserProfile(req.account) });
  }),
);
