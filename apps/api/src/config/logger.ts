import pino from 'pino';
import { env, isProd } from './env.js';

export const logger = pino({
  level: isProd ? 'info' : 'debug',
  base: undefined,
  redact: {
    paths: ['req.headers.authorization', 'req.headers["x-telegram-init-data"]'],
    remove: true,
  },
  transport: isProd
    ? undefined
    : {
        target: 'pino/file',
        options: { destination: 1 },
      },
});

void env; // ensure env validated before logger usage
