import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectMongo } from './db/mongoose.js';
import { redis, cache } from './redis/client.js';
import { analyzeQueue, analyzeQueueEvents } from './queue/analyzeQueue.js';

async function bootstrap() {
  await connectMongo();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'API listening');
  });

  const shutdown = async signal => {
    logger.info({ signal }, 'shutting down API');
    server.close(async () => {
      await Promise.allSettled([analyzeQueue.close(), analyzeQueueEvents.close(), redis.quit(), cache.quit()]);
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch(error => {
  logger.fatal({ error }, 'API failed to start');
  process.exit(1);
});
