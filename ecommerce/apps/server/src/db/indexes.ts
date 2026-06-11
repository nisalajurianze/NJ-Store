import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

/**
 * Ensures all performance-critical MongoDB indexes exist.
 *
 * Single-field indexes are declared inline on each schema. This module
 * creates the compound indexes that span multiple fields and are therefore
 * not expressible as simple schema-level `index: true` flags.
 *
 * All indexes are created with `background: true` so they do not block
 * reads or writes on an already-running replica set.
 */
export const ensureIndexes = async (): Promise<void> => {
  logger.info('db.indexes: ensuring compound indexes…');

  try {
    const db = mongoose.connection.db;

    if (!db) {
      logger.warn('db.indexes: mongoose connection has no db handle — skipping index creation');
      return;
    }

    // ------------------------------------------------------------------ //
    // Products
    // ------------------------------------------------------------------ //
    const products = db.collection('products');

    await products.createIndex(
      { isActive: 1, publishAt: 1, createdAt: -1 },
      { background: true, name: 'isActive_publishAt_createdAt' }
    );

    await products.createIndex(
      { category: 1, isActive: 1, price: 1 },
      { background: true, name: 'category_isActive_price' }
    );

    await products.createIndex(
      { brand: 1, isActive: 1, soldCount: -1 },
      { background: true, name: 'brand_isActive_soldCount' }
    );

    await products.createIndex(
      { brand: 1, isActive: 1, price: 1 },
      { background: true, name: 'brand_isActive_price' }
    );

    await products.createIndex(
      { isActive: 1, price: 1 },
      { background: true, name: 'isActive_price' }
    );

    await products.createIndex(
      { isActive: 1, isFeatured: 1, createdAt: -1 },
      { background: true, name: 'isActive_isFeatured_createdAt' }
    );

    await products.createIndex(
      { isActive: 1, isBestSeller: 1, soldCount: -1 },
      { background: true, name: 'isActive_isBestSeller_soldCount' }
    );

    await products.createIndex(
      { isActive: 1, isFlashDeal: 1, flashDealEndsAt: 1, soldCount: -1 },
      { background: true, name: 'isActive_isFlashDeal_flashDealEndsAt_soldCount' }
    );

    await products.createIndex(
      { slug: 1, isActive: 1, publishAt: 1 },
      { background: true, name: 'slug_isActive_publishAt' }
    );

    // ------------------------------------------------------------------ //
    // Categories
    // ------------------------------------------------------------------ //
    const categories = db.collection('categories');

    // `slug` already has a unique index from the schema; add `name` for
    // name-based lookups and autocomplete queries.
    await categories.createIndex(
      { name: 1 },
      { background: true, name: 'name_1' }
    );

    // ------------------------------------------------------------------ //
    // Reviews
    // ------------------------------------------------------------------ //
    const reviews = db.collection('reviews');

    // Supports filtering reviews by product + rating (e.g. "show 5-star reviews").
    await reviews.createIndex(
      { product: 1, rating: 1 },
      { background: true, name: 'product_rating' }
    );

    await reviews.createIndex(
      { product: 1, isApproved: 1, createdAt: -1 },
      { background: true, name: 'product_isApproved_createdAt' }
    );

    // ------------------------------------------------------------------ //
    // Orders
    // ------------------------------------------------------------------ //
    const orders = db.collection('orders');

    // Supports admin order list filtered by status, sorted by date.
    await orders.createIndex(
      { status: 1, createdAt: -1 },
      { background: true, name: 'status_createdAt' }
    );

    await orders.createIndex(
      { user: 1, deletedAt: 1, createdAt: -1 },
      { background: true, name: 'user_deletedAt_createdAt' }
    );

    logger.info('db.indexes: all compound indexes verified ✓');
  } catch (error) {
    // Index creation failures are non-fatal — the app can still serve
    // requests, just potentially with slower queries. Log the error so
    // it surfaces in monitoring without crashing the process.
    logger.error('db.indexes: failed to create one or more indexes', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
};
