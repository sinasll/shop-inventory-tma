import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { HttpError } from '../lib/http-error.js';
import { logger } from '../config/logger.js';
import { isProd } from '../config/env.js';

/** Wraps async handlers so thrown/rejected errors hit the error handler. */
export const asyncHandler =
  <T extends RequestHandler>(fn: T): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found', code: 'not_found' });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code, details: err.details });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      code: 'validation_error',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Already exists', code: 'conflict' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Not found', code: 'not_found' });
      return;
    }
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: isProd ? 'Internal server error' : String((err as Error)?.message ?? err),
    code: 'internal_error',
  });
};
