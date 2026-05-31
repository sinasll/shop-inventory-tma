import crypto from 'node:crypto';
import { env } from '../config/env.js';

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface VerifiedInitData {
  user: TelegramUser;
  authDate: number;
  raw: string;
}

export type InitDataError =
  | 'missing'
  | 'malformed'
  | 'bad_hash'
  | 'expired'
  | 'no_user';

export interface InitDataResult {
  ok: boolean;
  data?: VerifiedInitData;
  error?: InitDataError;
}

/**
 * Validates Telegram Mini App `initData` using the official algorithm:
 *
 *   secret_key = HMAC_SHA256(bot_token, "WebAppData")
 *   computed   = HMAC_SHA256(data_check_string, secret_key)
 *   valid      = computed === provided hash
 *
 * The data_check_string is all key=value pairs (except `hash`), sorted
 * alphabetically and joined by "\n". We compare in constant time and
 * enforce an auth_date freshness window to block replay attacks.
 *
 * The backend NEVER trusts client-supplied user identity — the id is
 * only taken from the cryptographically verified payload.
 */
export function verifyInitData(initData: string | undefined | null): InitDataResult {
  if (!initData || typeof initData !== 'string') return { ok: false, error: 'missing' };

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false, error: 'malformed' };
  }

  const hash = params.get('hash');
  if (!hash) return { ok: false, error: 'malformed' };

  // Build the data-check-string from every field except `hash`.
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === 'hash') continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(env.TELEGRAM_BOT_TOKEN)
    .digest();
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Constant-time comparison.
  const a = Buffer.from(computedHash, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: 'bad_hash' };
  }

  // Freshness / replay protection.
  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate)) return { ok: false, error: 'malformed' };
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (ageSeconds > env.INITDATA_MAX_AGE_SECONDS) return { ok: false, error: 'expired' };

  // Parse the verified user object.
  const userRaw = params.get('user');
  if (!userRaw) return { ok: false, error: 'no_user' };
  let user: TelegramUser;
  try {
    user = JSON.parse(userRaw) as TelegramUser;
  } catch {
    return { ok: false, error: 'no_user' };
  }
  if (!user || typeof user.id !== 'number') return { ok: false, error: 'no_user' };

  return { ok: true, data: { user, authDate, raw: initData } };
}
