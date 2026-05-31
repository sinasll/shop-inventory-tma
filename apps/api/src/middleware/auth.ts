import type { RequestHandler } from 'express';
import { adminIds, env } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';
import { verifyInitData } from '../lib/telegram-auth.js';
import { prisma } from '../lib/prisma.js';
import { ensureSubscriptionFresh } from '../modules/auth/subscription.service.js';

/**
 * Extract initData from the request. We accept the standard header
 * (`Authorization: tma <initData>`) and a dedicated header for clients
 * that cannot set Authorization inside the Telegram webview.
 */
function extractInitData(req: Parameters<RequestHandler>[0]): string | null {
  const header = req.header('authorization');
  if (header?.startsWith('tma ')) return header.slice(4).trim();
  const dedicated = req.header('x-telegram-init-data');
  if (dedicated) return dedicated.trim();
  return null;
}

/**
 * Primary protected-route guard:
 *  1. Cryptographically verify Telegram initData (never trust client id).
 *  2. Look up the verified id in the whitelist.
 *  3. Reject (403) if not whitelisted, disabled, or subscription expired.
 *  4. Attach the account + admin flag for downstream handlers.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const initData = extractInitData(req);

    // Dev-only escape hatch (must be explicitly enabled AND non-prod).
    if (!initData && env.ALLOW_INSECURE_AUTH && env.NODE_ENV !== 'production') {
      const devId = req.header('x-dev-telegram-id');
      if (devId) {
        const account = await prisma.whitelistedUser.findUnique({ where: { telegramId: devId } });
        if (!account) throw HttpError.forbidden('not_whitelisted');
        req.account = account;
        req.tgUser = { id: Number(devId), username: account.username ?? undefined };
        req.isAdmin = account.isAdmin || adminIds.has(devId);
        await touchLastSeen(devId);
        return next();
      }
    }

    const result = verifyInitData(initData);
    if (!result.ok || !result.data) {
      throw HttpError.unauthorized(result.error === 'expired' ? 'initdata_expired' : 'invalid_initdata');
    }

    const telegramId = String(result.data.user.id);
    const account = await prisma.whitelistedUser.findUnique({ where: { telegramId } });

    if (!account) throw HttpError.forbidden('not_whitelisted');

    // Auto-recompute expiry based on activeUntil, then enforce.
    const fresh = await ensureSubscriptionFresh(account);
    if (fresh.status === 'disabled') throw HttpError.forbidden('account_disabled');
    if (fresh.status === 'expired') throw HttpError.forbidden('subscription_expired');

    req.tgUser = result.data.user;
    req.account = fresh;
    req.isAdmin = fresh.isAdmin || adminIds.has(telegramId);
    await touchLastSeen(telegramId);

    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * Admin guard. Accepts either:
 *  - An authenticated request whose user is admin (isAdmin / master id), OR
 *  - A machine token via `x-admin-token` matching ADMIN_API_TOKEN.
 */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  const token = req.header('x-admin-token');
  if (env.ADMIN_API_TOKEN && token && safeEqual(token, env.ADMIN_API_TOKEN)) {
    req.isAdmin = true;
    return next();
  }
  if (req.isAdmin) return next();
  return next(HttpError.forbidden('admin_only'));
};

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function touchLastSeen(telegramId: string): Promise<void> {
  // Best-effort; never block the request on this write.
  prisma.whitelistedUser
    .update({ where: { telegramId }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined);
}
