import { describe, expect, it } from 'vitest';
import { addressSchema, checkoutItemSchema, passwordSchema, shopFilterPresetSchema } from './schemas.js';
describe('shared schemas', () => {
    it('validates strong passwords consistently', () => {
        expect(passwordSchema.safeParse('Password@123').success).toBe(true);
        expect(passwordSchema.safeParse('password').success).toBe(false);
    });
    it('validates Sri Lankan addresses', () => {
        expect(addressSchema.parse({
            label: 'Home',
            fullName: 'Nisha Perera',
            phone: '+94771234567',
            line1: '120 Galle Road',
            city: 'Colombo',
            district: 'Colombo',
            postalCode: '00300'
        })).toMatchObject({
            country: 'Sri Lanka',
            postalCode: '00300'
        });
    });
    it('validates checkout items', () => {
        expect(checkoutItemSchema.parse({
            productId: '507f1f77bcf86cd799439011',
            quantity: 2,
            variantIndex: 0
        })).toEqual({
            productId: '507f1f77bcf86cd799439011',
            quantity: 2,
            variantIndex: 0
        });
    });
    it('validates saved shop filters', () => {
        expect(shopFilterPresetSchema.parse({
            params: {
                inStock: 'true',
                sort: 'price_desc'
            },
            savedAt: '2026-04-22T08:00:00.000Z'
        })).toMatchObject({
            params: {
                inStock: 'true',
                sort: 'price_desc'
            }
        });
    });
});
