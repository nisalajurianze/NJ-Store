import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { ProductVersion } from '../models/ProductVersion.js';
import { productService } from '../services/productService.js';
import { clearTestDB, setupTestDB, teardownTestDB } from './testSetup.js';

const TEST_TIMEOUT = 40000;

beforeAll(async () => {
  await setupTestDB();
}, TEST_TIMEOUT);

afterAll(async () => {
  await teardownTestDB();
}, TEST_TIMEOUT);

beforeEach(async () => {
  await clearTestDB();
});

describe('Admin product enhancements', () => {
  it(
    'keeps future-scheduled products hidden from the public API until publish time and records versions',
    async () => {
      const category = await Category.create({
        name: 'Smartphones',
        slug: 'smartphones',
        description: 'Phones and accessories'
      });

      const futurePublishAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const createdProduct = await productService.createProduct(
        {
          name: 'Scheduled Flagship',
          description: 'Premium product hidden until launch day.',
          shortDescription: 'Premium launch product',
          price: 499000,
          category: category._id.toString(),
          images: [{ url: 'https://example.com/scheduled.jpg', publicId: 'scheduled-1', alt: 'Scheduled flagship' }],
          variants: [{ stock: 7, sku: 'SCH-FLAG-BASE' }],
          specifications: [{ key: 'Chipset', value: 'Flagship Gen' }],
          isActive: true,
          publishAt: futurePublishAt,
          sku: 'SCH-FLAG',
          loyaltyPoints: 200,
          canonicalUrl: 'https://njstore.lk/shop/scheduled-flagship'
        },
        { commitMessage: 'Created scheduled product' }
      );

      expect(await ProductVersion.countDocuments({ product: createdProduct.id })).toBe(1);

      const listBeforePublish = await request(app).get('/api/v1/products').query({ page: 1, limit: 12 }).expect(200);
      expect(listBeforePublish.body.data).toHaveLength(0);

      await request(app).get(`/api/v1/products/${createdProduct.slug}`).expect(404);

      await productService.updateProduct(
        createdProduct.id,
        { publishAt: new Date(Date.now() - 60 * 1000).toISOString() },
        { commitMessage: 'Published scheduled product' }
      );

      const listAfterPublish = await request(app).get('/api/v1/products').query({ page: 1, limit: 12 }).expect(200);
      expect(listAfterPublish.body.data).toHaveLength(1);
      expect(listAfterPublish.body.data[0].name).toBe('Scheduled Flagship');

      const detailAfterPublish = await request(app).get(`/api/v1/products/${createdProduct.slug}`).expect(200);
      expect(detailAfterPublish.body.data.canonicalUrl).toBe('https://njstore.lk/shop/scheduled-flagship');
      expect(await ProductVersion.countDocuments({ product: createdProduct.id })).toBe(2);
    },
    TEST_TIMEOUT
  );

  it(
    'bulk-adjusts prices, records a new version, and restores an older snapshot on demand',
    async () => {
      const category = await Category.create({
        name: 'Accessories',
        slug: 'accessories',
        description: 'Cables and adapters'
      });

      const createdProduct = await productService.createProduct(
        {
          name: 'Charging Brick',
          description: 'Fast charging brick with USB-C output.',
          shortDescription: 'USB-C fast charger',
          price: 10000,
          comparePrice: 12000,
          category: category._id.toString(),
          images: [{ url: 'https://example.com/brick.jpg', publicId: 'brick-1', alt: 'Charging brick' }],
          variants: [{ stock: 12, sku: 'BRICK-BASE', price: 10500 }],
          specifications: [{ key: 'Output', value: '65W' }],
          isActive: true,
          isFlashDeal: true,
          flashDealEndsAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          sku: 'BRICK-001',
          loyaltyPoints: 15
        },
        { commitMessage: 'Created charging brick' }
      );

      const adjustmentResult = await productService.bulkAdjustProductPrices(
        {
          productIds: [createdProduct.id],
          adjustmentType: 'fixed',
          amount: 2500,
          target: 'price',
          applyToVariantOverrides: true
        },
        { commitMessage: 'Raised price for accessories' }
      );

      expect(adjustmentResult).toEqual({
        updatedCount: 1,
        flashDealsDisabledCount: 1,
        updatedProductIds: [createdProduct.id]
      });

      const adjustedProduct = await Product.findById(createdProduct.id).lean();
      expect(adjustedProduct?.price).toBe(12500);
      expect(adjustedProduct?.variants[0]?.price).toBe(13000);
      expect(adjustedProduct?.isFlashDeal).toBe(false);

      const versionsAfterAdjustment = await productService.listProductVersions(createdProduct.id, 5);
      expect(versionsAfterAdjustment).toHaveLength(2);
      expect(versionsAfterAdjustment[0]?.version).toBe(2);

      const initialVersion = versionsAfterAdjustment.find((version) => version.version === 1);
      expect(initialVersion).toBeTruthy();

      await productService.restoreProductVersion(createdProduct.id, initialVersion!.id, {
        commitMessage: 'Restored original charging brick pricing'
      });

      const restoredProduct = await Product.findById(createdProduct.id).lean();
      expect(restoredProduct?.price).toBe(10000);
      expect(restoredProduct?.variants[0]?.price).toBe(10500);
      expect(restoredProduct?.isFlashDeal).toBe(true);

      const versionsAfterRestore = await productService.listProductVersions(createdProduct.id, 5);
      expect(versionsAfterRestore[0]?.version).toBe(3);
      expect(versionsAfterRestore[0]?.commitMessage).toBe('Restored original charging brick pricing');
    },
    TEST_TIMEOUT
  );
});
