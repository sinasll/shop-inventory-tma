import 'dotenv/config';
import { z } from 'zod';

/**
 * Strongly-typed, validated environment. The process refuses to boot
 * with an invalid config — fail fast instead of failing in production.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // Telegram bot token used for both initData HMAC validation & sending.
  TELEGRAM_BOT_TOKEN: z.string().min(20),
  TELEGRAM_BOT_USERNAME: z.string().optional(),

  // Comma-separated master admin Telegram IDs (full access bootstrap).
  ADMIN_TELEGRAM_IDS: z.string().default(''),
  // Optional shared secret for machine-to-machine admin calls.
  ADMIN_API_TOKEN: z.string().optional(),

  // Comma-separated allowed origins for CORS (the web app URL).
  CORS_ORIGINS: z.string().default('*'),

  // Allow opening outside Telegram in dev for local testing (NEVER prod).
  ALLOW_INSECURE_AUTH: z
    .string()
    .optional()
    .transform((v) => v === 'true'),

  // Telegram initData freshness window in seconds (replay protection).
  INITDATA_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(86400),

  // Cron tick cadence for the notification scheduler.
  NOTIFY_CRON: z.string().default('* * * * *'),
  CONTACT_ADMIN_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const adminIds = new Set(
  env.ADMIN_TELEGRAM_IDS.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

export const corsOrigins =
  env.CORS_ORIGINS === '*'
    ? '*'
    : env.CORS_ORIGINS.split(',')
        .map((s) => s.trim())
        .filter(Boolean);

export const isProd = env.NODE_ENV === 'production';
