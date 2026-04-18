import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { cache } from './redis/client.js';
import { analyzeInstagram, getAnalyzeJob, getHistory } from './controllers/analyzeController.js';
import { downloadMedia } from './controllers/downloadController.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN.split(',').map(origin => origin.trim()),
      credentials: false
    })
  );
  app.use(express.json({ limit: '32kb' }));

  const apiLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    store: new RedisStore({
      sendCommand: (...args) => cache.call(...args),
      prefix: 'rl:api:'
    }),
    standardHeaders: 'draft-7',
    legacyHeaders: false
  });

  const downloadLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.DOWNLOAD_RATE_LIMIT_MAX,
    store: new RedisStore({
      sendCommand: (...args) => cache.call(...args),
      prefix: 'rl:download:'
    }),
    standardHeaders: 'draft-7',
    legacyHeaders: false
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'instagram-downloader-api' });
  });

  app.post('/api/analyze', apiLimiter, analyzeInstagram);
  app.get('/api/analyze/:jobId', apiLimiter, getAnalyzeJob);
  app.get('/api/download', downloadLimiter, downloadMedia);
  app.get('/api/history', apiLimiter, getHistory);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
