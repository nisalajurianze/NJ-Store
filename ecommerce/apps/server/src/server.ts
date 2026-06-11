import http from 'node:http';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { ensureIndexes } from './db/indexes.js';
import { productService } from './services/productService.js';
import { schedulerService } from './services/schedulerService.js';
import { socketService } from './services/socketService.js';
import { logger } from './utils/logger.js';

const HOME_FEED_WARMUP_DELAY_MS = 3_000;

const warmHomeFeedCache = (): void => {
  const timer = setTimeout(() => {
    void productService
      .getHomeFeed()
      .then(() => {
        logger.info('cache.warm.home_feed=ok');
      })
      .catch((error) => {
        logger.warn(`cache.warm.home_feed=failed ${error instanceof Error ? error.message : 'unknown error'}`);
      });
  }, HOME_FEED_WARMUP_DELAY_MS);

  timer.unref();
};

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();
    logger.info('Running index initialization…');
    await ensureIndexes();
    const httpServer = http.createServer(app);
    socketService.init(httpServer);
    schedulerService.start();
    httpServer.listen(env.PORT, () => {
      logger.info(`Server listening on port ${env.PORT}`);
      warmHomeFeedCache();
    });
  } catch (error) {
    logger.error(error as Error);
    process.exit(1);
  }
};

void startServer();
