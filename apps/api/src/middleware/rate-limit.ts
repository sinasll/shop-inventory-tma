import rateLimit from 'express-rate-limit';

/** Global limiter — generous for normal app usage, blocks abuse. */
export const globalRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 240,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'rate_limited' },
});

/** Tighter limiter for mutating product endpoints (fast-entry still ok). */
export const writeRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'rate_limited' },
});

/** Strict limiter for admin endpoints. */
export const adminRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'rate_limited' },
});
