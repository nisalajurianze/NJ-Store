import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Brand } from '../models/Brand.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { cacheKeys, cacheNamespaces, cacheService } from '../services/cacheService.js';
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
describe('Product listing', () => {
    it('caches the public home feed until catalog cache namespaces change', async () => {
        await cacheService.bumpNamespace(cacheNamespaces.products);
        await cacheService.bumpNamespace(cacheNamespaces.brands);
        await cacheService.bumpNamespace(cacheNamespaces.categories);
        const category = await Category.create({
            name: 'Home Picks',
            slug: 'home-picks',
            description: 'Featured home page devices'
        });
        const brand = await Brand.create({
            name: 'NJ Labs',
            slug: 'nj-labs',
            isActive: true,
            sortOrder: 1
        });
        const product = await Product.create({
            name: 'Cached Home Phone',
            slug: 'cached-home-phone',
            description: 'A featured phone for the home feed.',
            shortDescription: 'Featured home feed phone',
            price: 249000,
            brand: brand._id,
            brandName: brand.name,
            sku: 'NJ-HOME-CACHED',
            category: category._id,
            images: [{ url: 'https://example.com/home-phone.jpg', publicId: 'home-phone', alt: 'Cached Home Phone' }],
            variants: [{ stock: 10, sku: 'NJ-HOME-CACHED-BASE' }],
            isFeatured: true,
            isActive: true
        });
        const firstFeed = await productService.getHomeFeed();
        await Product.updateOne({ _id: product._id }, { $set: { name: 'Updated Home Phone' } });
        const cachedFeed = await productService.getHomeFeed();
        await cacheService.delete(cacheKeys.homePublicFeed());
        await cacheService.bumpNamespace(cacheNamespaces.products);
        const refreshedFeed = await productService.getHomeFeed();
        expect(firstFeed.featured[0]?.name).toBe('Cached Home Phone');
        expect(cachedFeed.featured[0]?.name).toBe('Cached Home Phone');
        expect(refreshedFeed.featured[0]?.name).toBe('Updated Home Phone');
    }, TEST_TIMEOUT);
    it('returns public products when query validation is applied', async () => {
        const category = await Category.create({
            name: 'Smartphones',
            slug: 'smartphones',
            description: 'Phones and accessories'
        });
        const brand = await Brand.create({
            name: 'Samsung',
            slug: 'samsung',
            isActive: true,
            sortOrder: 1
        });
        await Product.create({
            name: 'Galaxy S24 Ultra',
            slug: 'galaxy-s24-ultra',
            description: 'Flagship smartphone with premium camera system.',
            shortDescription: 'Premium flagship smartphone',
            price: 449000,
            brand: brand._id,
            brandName: brand.name,
            sku: 'SAM-S24U',
            category: category._id,
            images: [{ url: 'https://example.com/product.jpg', publicId: 'product-1', alt: 'Galaxy S24 Ultra' }],
            variants: [{ stock: 10, sku: 'SAM-S24U-BLK-256' }],
            isActive: true
        });
        const response = await request(app)
            .get('/api/v1/products')
            .query({ page: 1, limit: 12 })
            .expect(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Galaxy S24 Ultra');
        expect(response.body.pagination.total).toBe(1);
    }, TEST_TIMEOUT);
    it('sanitizes unsafe query keys without failing under Express 5', async () => {
        const category = await Category.create({
            name: 'Printers',
            slug: 'printers',
            description: 'Office printers'
        });
        const brand = await Brand.create({
            name: 'HP',
            slug: 'hp',
            isActive: true,
            sortOrder: 1
        });
        await Product.create({
            name: 'LaserJet Pro',
            slug: 'laserjet-pro',
            description: 'Compact laser printer for office work.',
            shortDescription: 'Compact laser printer',
            price: 125000,
            brand: brand._id,
            brandName: brand.name,
            sku: 'HP-LJP',
            category: category._id,
            images: [{ url: 'https://example.com/printer.jpg', publicId: 'product-2', alt: 'LaserJet Pro' }],
            variants: [{ stock: 5, sku: 'HP-LJP-BASE' }],
            isActive: true
        });
        const response = await request(app)
            .get('/api/v1/products')
            .query({
            page: 1,
            limit: 12,
            category: 'printers',
            brand: 'HP',
            minPrice: 125000,
            maxPrice: 125000,
            $where: 'sleep(1000)'
        })
            .expect(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.some((product) => product.name === 'LaserJet Pro')).toBe(true);
    }, TEST_TIMEOUT);
    it('filters flash deals to active countdown-capable or evergreen entries', async () => {
        const category = await Category.create({
            name: 'Accessories',
            slug: 'accessories',
            description: 'Chargers and accessories'
        });
        const anker = await Brand.create({
            name: 'Anker',
            slug: 'anker',
            isActive: true,
            sortOrder: 1
        });
        const belkin = await Brand.create({
            name: 'Belkin',
            slug: 'belkin',
            isActive: true,
            sortOrder: 2
        });
        await Product.create([
            {
                name: 'Timed Flash Deal',
                slug: 'timed-flash-deal',
                description: 'A current flash deal.',
                shortDescription: 'Current flash deal',
                price: 15000,
                comparePrice: 20000,
                brand: anker._id,
                brandName: anker.name,
                sku: 'ANK-TIMED',
                category: category._id,
                images: [{ url: 'https://example.com/timed.jpg', publicId: 'timed-1', alt: 'Timed flash deal' }],
                variants: [{ stock: 8, sku: 'ANK-TIMED-BASE' }],
                isFlashDeal: true,
                flashDealEndsAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
                isActive: true
            },
            {
                name: 'Expired Flash Deal',
                slug: 'expired-flash-deal',
                description: 'An expired flash deal.',
                shortDescription: 'Expired flash deal',
                price: 17000,
                comparePrice: 22000,
                brand: belkin._id,
                brandName: belkin.name,
                sku: 'BEL-EXPIRED',
                category: category._id,
                images: [{ url: 'https://example.com/expired.jpg', publicId: 'expired-1', alt: 'Expired flash deal' }],
                variants: [{ stock: 8, sku: 'BEL-EXPIRED-BASE' }],
                isFlashDeal: true,
                flashDealEndsAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
                isActive: true
            }
        ]);
        const response = await request(app)
            .get('/api/v1/products')
            .query({ flashDeal: true, page: 1, limit: 12 })
            .expect(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Timed Flash Deal');
        expect(response.body.data[0].flashDealEndsAt).toBeDefined();
    }, TEST_TIMEOUT);
    it('returns a compact public price range without fetching product cards', async () => {
        const category = await Category.create({
            name: 'Laptops',
            slug: 'laptops',
            description: 'Portable computers'
        });
        const brand = await Brand.create({
            name: 'Dell',
            slug: 'dell',
            isActive: true,
            sortOrder: 1
        });
        await Product.create([
            {
                name: 'Entry Laptop',
                slug: 'entry-laptop',
                description: 'Entry work laptop.',
                shortDescription: 'Entry laptop',
                price: 150000,
                brand: brand._id,
                brandName: brand.name,
                sku: 'DELL-ENTRY',
                category: category._id,
                images: [{ url: 'https://example.com/entry.jpg', publicId: 'entry-1', alt: 'Entry laptop' }],
                variants: [{ stock: 5, sku: 'DELL-ENTRY-BASE' }],
                isActive: true
            },
            {
                name: 'Pro Laptop',
                slug: 'pro-laptop',
                description: 'Pro work laptop.',
                shortDescription: 'Pro laptop',
                price: 350000,
                brand: brand._id,
                brandName: brand.name,
                sku: 'DELL-PRO',
                category: category._id,
                images: [{ url: 'https://example.com/pro.jpg', publicId: 'pro-1', alt: 'Pro laptop' }],
                variants: [{ stock: 5, sku: 'DELL-PRO-BASE' }],
                isActive: true
            }
        ]);
        const response = await request(app)
            .get('/api/v1/products/price-range')
            .query({ category: category._id.toString() })
            .expect(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual({ min: 150000, max: 350000 });
    }, TEST_TIMEOUT);
    it('excludes requested products from public related-product lists', async () => {
        const category = await Category.create({
            name: 'Monitors',
            slug: 'monitors',
            description: 'Displays'
        });
        const brand = await Brand.create({
            name: 'LG',
            slug: 'lg',
            isActive: true,
            sortOrder: 1
        });
        const [currentProduct, relatedProduct] = await Product.create([
            {
                name: 'Current Monitor',
                slug: 'current-monitor',
                description: 'Primary monitor.',
                shortDescription: 'Primary monitor',
                price: 90000,
                brand: brand._id,
                brandName: brand.name,
                sku: 'LG-CURRENT',
                category: category._id,
                images: [{ url: 'https://example.com/current.jpg', publicId: 'current-1', alt: 'Current monitor' }],
                variants: [{ stock: 5, sku: 'LG-CURRENT-BASE' }],
                isActive: true
            },
            {
                name: 'Related Monitor',
                slug: 'related-monitor',
                description: 'Related monitor.',
                shortDescription: 'Related monitor',
                price: 110000,
                brand: brand._id,
                brandName: brand.name,
                sku: 'LG-RELATED',
                category: category._id,
                images: [{ url: 'https://example.com/related.jpg', publicId: 'related-1', alt: 'Related monitor' }],
                variants: [{ stock: 5, sku: 'LG-RELATED-BASE' }],
                isActive: true
            }
        ]);
        const response = await request(app)
            .get('/api/v1/products')
            .query({ category: category._id.toString(), excludeIds: currentProduct._id.toString(), limit: 4 })
            .expect(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.map((product) => product.id)).toEqual([relatedProduct._id.toString()]);
    }, TEST_TIMEOUT);
    it('returns curated upsells in one request and excludes cart items', async () => {
        const category = await Category.create({
            name: 'Computer Accessories',
            slug: 'computer-accessories',
            description: 'Accessories'
        });
        const brand = await Brand.create({
            name: 'Logitech',
            slug: 'logitech',
            isActive: true,
            sortOrder: 1
        });
        const [cartProduct, accessory] = await Product.create([
            {
                name: 'Office Laptop',
                slug: 'office-laptop',
                description: 'Cart laptop.',
                shortDescription: 'Cart laptop',
                price: 220000,
                brand: brand._id,
                brandName: brand.name,
                sku: 'LOGI-LAPTOP',
                category: category._id,
                images: [{ url: 'https://example.com/laptop.jpg', publicId: 'laptop-1', alt: 'Office laptop' }],
                variants: [{ stock: 5, sku: 'LOGI-LAPTOP-BASE' }],
                isActive: true
            },
            {
                name: 'Wireless Mouse',
                slug: 'wireless-mouse',
                description: 'Recommended mouse.',
                shortDescription: 'Wireless mouse',
                price: 9500,
                brand: brand._id,
                brandName: brand.name,
                sku: 'LOGI-MOUSE',
                category: category._id,
                images: [{ url: 'https://example.com/mouse.jpg', publicId: 'mouse-1', alt: 'Wireless mouse' }],
                variants: [{ stock: 8, sku: 'LOGI-MOUSE-BASE' }],
                isBestSeller: true,
                isActive: true
            }
        ]);
        const response = await request(app)
            .post('/api/v1/products/upsell')
            .send({ items: [{ productId: cartProduct._id.toString(), quantity: 1 }], limit: 3 })
            .expect(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.map((product) => product.id)).toEqual([accessory._id.toString()]);
    }, TEST_TIMEOUT);
    it('prioritizes accessory add-ons over similar main products for cart upsells', async () => {
        const [phoneCategory, accessoryCategory] = await Category.create([
            {
                name: 'Smartphones',
                slug: 'smartphones',
                description: 'Phones'
            },
            {
                name: 'Phone Accessories',
                slug: 'phone-accessories',
                description: 'Cases, chargers, and mobile accessories'
            }
        ]);
        const brand = await Brand.create({
            name: 'Samsung',
            slug: 'samsung-upsell',
            isActive: true,
            sortOrder: 1
        });
        const [cartProduct, similarPhone, accessory] = await Product.create([
            {
                name: 'Galaxy S24',
                slug: 'galaxy-s24-upsell-cart',
                description: 'Cart phone.',
                shortDescription: 'Cart phone',
                price: 260000,
                brand: brand._id,
                brandName: brand.name,
                sku: 'SAMSUNG-S24-CART',
                category: phoneCategory._id,
                images: [{ url: 'https://example.com/phone.jpg', publicId: 'phone-1', alt: 'Phone' }],
                variants: [{ stock: 5, sku: 'SAMSUNG-S24-CART-BASE' }],
                isActive: true
            },
            {
                name: 'Galaxy S24 Ultra',
                slug: 'galaxy-s24-ultra-upsell',
                description: 'Similar phone.',
                shortDescription: 'Similar phone',
                price: 420000,
                brand: brand._id,
                brandName: brand.name,
                sku: 'SAMSUNG-S24-ULTRA-UPSELL',
                category: phoneCategory._id,
                images: [{ url: 'https://example.com/phone-ultra.jpg', publicId: 'phone-ultra-1', alt: 'Phone Ultra' }],
                variants: [{ stock: 5, sku: 'SAMSUNG-S24-ULTRA-UPSELL-BASE' }],
                isBestSeller: true,
                isActive: true
            },
            {
                name: 'Galaxy S24 Protective Case',
                slug: 'galaxy-s24-protective-case',
                description: 'Accessory case.',
                shortDescription: 'Protective case accessory',
                price: 8500,
                brand: brand._id,
                brandName: brand.name,
                sku: 'SAMSUNG-S24-CASE',
                category: accessoryCategory._id,
                tags: ['accessories', 'case', 'protector'],
                images: [{ url: 'https://example.com/case.jpg', publicId: 'case-1', alt: 'Phone case' }],
                variants: [{ stock: 12, sku: 'SAMSUNG-S24-CASE-BASE' }],
                isActive: true
            }
        ]);
        const response = await request(app)
            .post('/api/v1/products/upsell')
            .send({ items: [{ productId: cartProduct._id.toString(), quantity: 1 }], limit: 1 })
            .expect(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.map((product) => product.id)).toEqual([accessory._id.toString()]);
        expect(response.body.data.map((product) => product.id)).not.toContain(similarPhone._id.toString());
    }, TEST_TIMEOUT);
});
