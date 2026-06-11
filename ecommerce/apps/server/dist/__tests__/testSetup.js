import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { vi } from 'vitest';
import { cacheNamespaces, cacheService } from '../services/cacheService.js';
// Mock external services to prevent network calls during tests.
vi.mock('../services/emailService.js', () => ({
    sendEmail: vi.fn(),
    emailService: {
        sendVerification: vi.fn(),
        sendPasswordReset: vi.fn(),
        sendQuotation: vi.fn(),
        sendOrderConfirmation: vi.fn(),
        sendOrderShipped: vi.fn(),
        sendReceiptRejected: vi.fn(),
        sendLowStockAlert: vi.fn(),
        sendBackInStock: vi.fn(),
        sendAbandonedCartRecovery: vi.fn(),
        sendNewsletterConfirmation: vi.fn(),
        sendNewsletterWelcome: vi.fn(),
        sendAdminBroadcast: vi.fn()
    }
}));
vi.mock('../services/pdfService.js', () => ({
    generateOrderPdfBuffer: vi.fn().mockResolvedValue(Buffer.from('mock pdf content')),
    generateAnalyticsPdfBuffer: vi.fn().mockResolvedValue(Buffer.from('mock analytics pdf content')),
    generateSalesAnalysisPdfBuffer: vi.fn().mockResolvedValue(Buffer.from('mock sales analysis pdf content'))
}));
let mongoServer;
export const setupTestDB = async () => {
    mongoServer = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: 'wiredTiger'
        }
    });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
};
export const teardownTestDB = async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
};
export const clearTestDB = async () => {
    vi.clearAllMocks();
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
    await Promise.all([
        cacheService.bumpNamespace(cacheNamespaces.analytics),
        cacheService.bumpNamespace(cacheNamespaces.banners),
        cacheService.bumpNamespace(cacheNamespaces.categories),
        cacheService.bumpNamespace(cacheNamespaces.customerBehavior),
        cacheService.bumpNamespace(cacheNamespaces.products),
        cacheService.bumpNamespace(cacheNamespaces.siteConfig)
    ]);
};
