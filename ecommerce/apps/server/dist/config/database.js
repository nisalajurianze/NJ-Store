import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
const normalizeLocalMongoUri = (mongoUri) => {
    const isDevelopment = (process.env.NODE_ENV ?? 'development') !== 'production';
    const isLocalMongo = /^mongodb:\/\/(?:[^@/]+@)?(?:127\.0\.0\.1|localhost):27017(?:\/|$)/i.test(mongoUri);
    const hasReplicaSet = /(?:\?|&)replicaSet=/i.test(mongoUri);
    if (!isDevelopment || !isLocalMongo || hasReplicaSet) {
        return mongoUri;
    }
    const separator = mongoUri.includes('?') ? '&' : '?';
    return `${mongoUri}${separator}replicaSet=rs0`;
};
/**
 * Establishes the MongoDB connection used by the API.
 */
export const connectDatabase = async () => {
    mongoose.set('strictQuery', true);
    await mongoose.connect(normalizeLocalMongoUri(env.MONGO_URI));
    logger.info('MongoDB connected successfully');
};
