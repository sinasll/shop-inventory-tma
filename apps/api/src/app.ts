import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import { corsOrigins } from './config/env.js';
import { logger } from './config/logger.js';
import { globalRateLimiter, writeRateLimiter } from './middleware/rate-limit.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { productRouter } from './modules/products/product.routes.js';
import { inventoryRouter } from './modules/inventory/inventory.routes.js';
import { settingsRouter } from './modules/settings/settings.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1); // Render/Railway/Fly run behind a proxy.

  app.use(
    helmet({
      // The API serves JSON only; relax CSP that would block nothing here.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: corsOrigins,
      credentials: false,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Telegram-Init-Data',
        'X-Admin-Token',
        'X-Dev-Telegram-Id',
      ],
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '256kb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  // Health check (used by hosting platforms & uptime monitors).
  app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

  app.use('/api', globalRateLimiter);

  app.use('/api/auth', authRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/products', writeRateLimiter, productRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
