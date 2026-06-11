import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { clearTestDB, setupTestDB, teardownTestDB } from './testSetup.js';
import { catalogAdminService as adminService } from '../services/admin/index.js';
import { Brand } from '../models/Brand.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
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
describe('Admin CSV product import', () => {
    it('imports export-style CSV rows into valid products', async () => {
        await Category.create({
            name: 'Laptops',
            slug: 'laptops',
            description: 'Portable computers'
        });
        const csv = [
            'Name,Brand,SKU,Price,ComparePrice,Stock,Category,Active,FeaturedStatus,BestSeller,FlashDeal',
            '"Office Laptop","Dell","DEL-CSV-1",250000,275000,6,"Laptops",Yes,Yes,No,Yes'
        ].join('\n');
        const result = await adminService.importProductsCsv(Buffer.from(csv, 'utf-8'));
        expect(result).toEqual({ success: 1, failed: 0 });
        const product = await Product.findOne({ sku: 'DEL-CSV-1' }).populate('category').populate('brand');
        expect(product).not.toBeNull();
        expect(product?.name).toBe('Office Laptop');
        expect(product?.brand?.name).toBe('Dell');
        expect(product?.brandName).toBe('Dell');
        expect(product?.price).toBe(250000);
        expect(product?.comparePrice).toBe(275000);
        expect(product?.isActive).toBe(true);
        expect(product?.isFeatured).toBe(true);
        expect(product?.isBestSeller).toBe(false);
        expect(product?.isFlashDeal).toBe(true);
        expect(product?.shortDescription).toContain('Dell Office Laptop');
        expect(product?.description).toContain('Imported from CSV');
        expect(product?.variants).toHaveLength(1);
        expect(product?.variants[0]?.sku).toBe('DEL-CSV-1');
        expect(product?.variants[0]?.stock).toBe(6);
        expect(product?.category?.name).toBe('Laptops');
    }, TEST_TIMEOUT);
    it('updates an existing single-variant product when the CSV row reuses its SKU', async () => {
        const category = await Category.create({
            name: 'Accessories',
            slug: 'accessories',
            description: 'Device accessories'
        });
        await Product.create({
            name: 'Wireless Mouse',
            slug: 'wireless-mouse',
            description: 'Original description',
            shortDescription: 'Original short description',
            price: 12000,
            brandName: 'Logitech',
            sku: 'LOG-MSE-1',
            category: category._id,
            images: [],
            variants: [{ stock: 2, sku: 'LOG-MSE-1' }],
            isActive: false
        });
        const csv = [
            'Name,Brand,SKU,Price,ComparePrice,Stock,Category,Active,FeaturedStatus,BestSeller,FlashDeal',
            '"Wireless Mouse 2","Logitech","LOG-MSE-1",15000,,9,"Accessories",Yes,No,Yes,No'
        ].join('\n');
        const result = await adminService.importProductsCsv(Buffer.from(csv, 'utf-8'));
        expect(result).toEqual({ success: 1, failed: 0 });
        const product = await Product.findOne({ sku: 'LOG-MSE-1' }).populate('brand');
        expect(product).not.toBeNull();
        expect(product?.name).toBe('Wireless Mouse 2');
        expect(product?.brandName).toBe('Logitech');
        expect(product?.brand?.name).toBe('Logitech');
        expect(product?.price).toBe(15000);
        expect(product?.isActive).toBe(true);
        expect(product?.isFeatured).toBe(false);
        expect(product?.isBestSeller).toBe(true);
        expect(product?.variants).toHaveLength(1);
        expect(product?.variants[0]?.stock).toBe(9);
    }, TEST_TIMEOUT);
    it('creates missing brand records from imported CSV rows', async () => {
        await Category.create({
            name: 'Audio',
            slug: 'audio',
            description: 'Audio devices'
        });
        const csv = [
            'Name,Brand,SKU,Price,ComparePrice,Stock,Category,Active,FeaturedStatus,BestSeller,FlashDeal',
            '"Portable Speaker","JBL","JBL-CSV-1",45000,49900,14,"Audio",Yes,No,No,No'
        ].join('\n');
        const result = await adminService.importProductsCsv(Buffer.from(csv, 'utf-8'));
        expect(result).toEqual({ success: 1, failed: 0 });
        expect(await Brand.exists({ slug: 'jbl' })).toBeTruthy();
    }, TEST_TIMEOUT);
});
