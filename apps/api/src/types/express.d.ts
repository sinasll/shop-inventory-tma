import type { WhitelistedUser } from '@prisma/client';
import type { TelegramUser } from '../lib/telegram-auth.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** The verified Telegram user (identity from cryptographic check). */
      tgUser?: TelegramUser;
      /** The authorized whitelist account record. */
      account?: WhitelistedUser;
      /** True when the caller is a master/admin (id or token). */
      isAdmin?: boolean;
    }
  }
}

export {};
