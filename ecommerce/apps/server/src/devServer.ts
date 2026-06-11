import http from 'node:http';
import net from 'node:net';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config();

const isDevelopment = (process.env.NODE_ENV ?? 'development') !== 'production';
const fallbackEnabled = process.env.DEV_MEMORY_MONGO_FALLBACK !== 'false';
const autoSeedEnabled = process.env.DEV_SEED_MEMORY_MONGO !== 'false';
const DEFAULT_DEV_MONGO_USERNAME = process.env.MONGO_ROOT_USERNAME ?? 'njstore';
const DEFAULT_DEV_MONGO_PASSWORD = process.env.MONGO_ROOT_PASSWORD ?? 'njstore-dev-mongo-password';
const DEFAULT_DEV_MONGO_URI = `mongodb://${encodeURIComponent(DEFAULT_DEV_MONGO_USERNAME)}:${encodeURIComponent(
  DEFAULT_DEV_MONGO_PASSWORD
)}@127.0.0.1:27017/njstore?authSource=admin&replicaSet=rs0`;

const parseMongoTarget = (mongoUri: string): { host: string; port: number } | null => {
  const match = mongoUri.match(/^mongodb:\/\/(?:[^@/]+@)?([^/:?,]+)(?::(\d+))?/i);
  if (!match) {
    return null;
  }

  return {
    host: match[1],
    port: Number(match[2] ?? '27017')
  };
};

const canReachMongo = async (mongoUri: string): Promise<boolean> => {
  const target = parseMongoTarget(mongoUri);
  if (!target) {
    return true;
  }

  if (!['127.0.0.1', 'localhost'].includes(target.host)) {
    return true;
  }

  const portIsOpen = await new Promise<boolean>((resolve) => {
    const socket = net.createConnection(target.port, target.host);

    const finish = (result: boolean): void => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(1200);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });

  if (!portIsOpen) {
    return false;
  }

  let connection: mongoose.Connection | null = null;
  try {
    connection = await mongoose.createConnection(mongoUri, { serverSelectionTimeoutMS: 1500 }).asPromise();
    await connection.db?.admin().command({ ping: 1 });
    return true;
  } catch {
    return false;
  } finally {
    await connection?.close().catch(() => undefined);
  }
};

const start = async (): Promise<void> => {
  let memoryServer: MongoMemoryServer | null = null;
  const configuredMongoUri = process.env.MONGO_URI ?? (isDevelopment ? DEFAULT_DEV_MONGO_URI : undefined);

  if (!configuredMongoUri) {
    throw new Error('MONGO_URI is required before starting the server');
  }

  if (!process.env.MONGO_URI && isDevelopment) {
    process.env.MONGO_URI = configuredMongoUri;
    console.warn(`[dev-server] MONGO_URI was not set. Using default local MongoDB URI: ${DEFAULT_DEV_MONGO_URI}`);
  }

  if (isDevelopment && fallbackEnabled) {
    const mongoAvailable = await canReachMongo(configuredMongoUri);

    if (!mongoAvailable) {
      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'njstore'
        }
      });

      const memoryUri = memoryServer.getUri('njstore');
      process.env.MONGO_URI = memoryUri;
      process.env.DEV_USING_MEMORY_MONGO = 'true';

      console.warn('[dev-server] Local MongoDB was unreachable or rejected the configured credentials. Falling back to an in-memory MongoDB instance.');
      console.warn('[dev-server] Data will be ephemeral until Docker or a local MongoDB service is available again.');

      if (autoSeedEnabled) {
        console.warn('[dev-server] Seeding the in-memory database for local development...');
        const { seedDatabase } = await import('./utils/seed.js');
        await seedDatabase();
      }
    }
  }

  console.warn('[dev-server] Loading server modules...');
  const [{ connectDatabase }, { env }, { logger }, { default: app }, { socketService }] = await Promise.all([
    import('./config/database.js'),
    import('./config/env.js'),
    import('./utils/logger.js'),
    import('./app.js'),
    import('./services/socketService.js')
  ]);
  console.warn('[dev-server] Server modules loaded.');

  let server: http.Server | null = null;

  const shutdown = async (): Promise<void> => {
    if (server) {
      await new Promise<void>((resolve) => {
        server?.close(() => resolve());
      });
      server = null;
    }

    if (memoryServer) {
      await memoryServer.stop();
    }
  };

  process.on('SIGINT', () => {
    void shutdown().finally(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    void shutdown().finally(() => process.exit(0));
  });

  await connectDatabase();
  console.warn(`[dev-server] Starting HTTP listener on port ${env.PORT}...`);
  server = http.createServer(app);
  socketService.init(server);
  server.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`);
    console.warn(`[dev-server] HTTP listener ready on port ${env.PORT}.`);
  });
  server.on('error', (error) => {
    console.error('[dev-server] HTTP listener failed to start.', error);
  });
};

void start().catch((error) => {
  console.error(error);
  process.exit(1);
});
