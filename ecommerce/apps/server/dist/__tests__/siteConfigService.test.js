import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EmailTemplate } from '../models/EmailTemplate.js';
import { StoreSetting } from '../models/StoreSetting.js';
import { siteConfigService } from '../services/siteConfigService.js';
import { clearTestDB, setupTestDB, teardownTestDB } from './testSetup.js';
const TEST_TIMEOUT = 60000;
beforeAll(async () => {
    await setupTestDB();
}, TEST_TIMEOUT);
afterAll(async () => {
    await teardownTestDB();
}, TEST_TIMEOUT);
beforeEach(async () => {
    await clearTestDB();
});
describe('siteConfigService.updateConfig', () => {
    it('persists storefront maintenance, tax settings, currencies, notification settings, social links, and email templates', async () => {
        const updated = await siteConfigService.updateConfig({
            loyaltyPointsRate: 250,
            cancellationWindowHours: 12,
            quotationExpiryDays: 10,
            storeLogo: {
                url: 'https://res.cloudinary.com/demo/image/upload/v1710000000/njstore/site-config/store-logo.png',
                publicId: 'njstore/site-config/store-logo',
                alt: 'NJ Store logo'
            },
            taxSettings: {
                enabled: true,
                label: 'VAT',
                rate: 18
            },
            socialLinks: {
                facebook: 'https://www.facebook.com/njstore',
                instagram: 'https://www.instagram.com/njstore',
                tiktok: 'https://www.tiktok.com/@njstore',
                youtube: 'https://www.youtube.com/@njstore',
                x: 'https://x.com/njstore'
            },
            footer: {
                companyName: 'NJ Store',
                description: 'Premium electronics with local support.',
                email: 'support@njstore.com',
                phone: '+94 11 245 8899',
                whatsappNumber: '94112458899',
                physicalAddress: '120 Galle Road, Colombo 03, Sri Lanka',
                mapEmbedUrl: 'https://www.google.com/maps?q=Colombo%2003%20Sri%20Lanka&output=embed',
                openingHours: 'Mon-Sat, 9:00 AM to 6:00 PM',
                copyrightText: '© NJ Store. All rights reserved.',
                socialLinks: {
                    facebook: 'https://www.facebook.com/njstore',
                    instagram: 'https://www.instagram.com/njstore',
                    tiktok: 'https://www.tiktok.com/@njstore',
                    youtube: 'https://www.youtube.com/@njstore',
                    x: 'https://x.com/njstore'
                },
                sectionTitles: {
                    about: 'About',
                    quickLinks: 'Quick Links',
                    contact: 'Contact Info',
                    social: 'Social & Updates'
                },
                quickLinks: [
                    { label: 'Privacy Policy', href: '/privacy' },
                    { label: 'Terms & Conditions', href: '/terms' },
                    { label: 'Return Policy', href: '/returns' },
                    { label: 'FAQ', href: '/faq' }
                ]
            },
            supportedCurrencies: [
                {
                    code: 'LKR',
                    symbol: 'LKR',
                    rate: 1,
                    isDefault: true
                },
                {
                    code: 'USD',
                    symbol: '$',
                    rate: 0.0033,
                    isDefault: false
                }
            ],
            maintenanceMode: {
                enabled: true,
                message: 'Temporarily offline for inventory reconciliation.'
            },
            notificationSettings: {
                quotationReady: { emailEnabled: true, smsEnabled: false },
                orderConfirmed: { emailEnabled: true, smsEnabled: false },
                orderShipped: { emailEnabled: true, smsEnabled: true },
                receiptRejected: { emailEnabled: true, smsEnabled: false },
                lowStockAlert: { emailEnabled: true, smsEnabled: true }
            },
            emailTemplates: [
                {
                    type: 'order_confirmation',
                    subject: 'Your order is confirmed',
                    bodyHtml: '<h1>Thanks for shopping with us</h1>'
                }
            ]
        });
        expect(updated.loyaltyPointsRate).toBe(250);
        expect(updated.cancellationWindowHours).toBe(12);
        expect(updated.quotationExpiryDays).toBe(10);
        expect(updated.storeLogo).toMatchObject({
            publicId: 'njstore/site-config/store-logo',
            alt: 'NJ Store logo'
        });
        expect(updated.taxSettings).toEqual({
            enabled: true,
            label: 'VAT',
            rate: 18
        });
        expect(updated.socialLinks).toEqual({
            facebook: 'https://www.facebook.com/njstore',
            instagram: 'https://www.instagram.com/njstore',
            tiktok: 'https://www.tiktok.com/@njstore',
            youtube: 'https://www.youtube.com/@njstore',
            x: 'https://x.com/njstore'
        });
        expect(updated.footer).toMatchObject({
            companyName: 'NJ Store',
            email: 'support@njstore.com',
            phone: '+94 11 245 8899',
            physicalAddress: '120 Galle Road, Colombo 03, Sri Lanka'
        });
        expect(updated.supportedCurrencies).toEqual([
            {
                code: 'LKR',
                symbol: 'LKR',
                rate: 1,
                isDefault: true
            },
            {
                code: 'USD',
                symbol: '$',
                rate: 0.0033,
                isDefault: false
            }
        ]);
        expect(updated.maintenanceMode).toEqual({
            enabled: true,
            message: 'Temporarily offline for inventory reconciliation.'
        });
        expect(updated.notificationSettings).toEqual({
            quotationReady: { emailEnabled: true, smsEnabled: false },
            orderConfirmed: { emailEnabled: true, smsEnabled: false },
            orderShipped: { emailEnabled: true, smsEnabled: true },
            receiptRejected: { emailEnabled: true, smsEnabled: false },
            lowStockAlert: { emailEnabled: true, smsEnabled: true }
        });
        expect(updated.emailTemplates).toEqual([
            {
                type: 'order_confirmation',
                subject: 'Your order is confirmed',
                bodyHtml: '<h1>Thanks for shopping with us</h1>'
            }
        ]);
        const storedConfig = await StoreSetting.findOne().lean();
        expect(storedConfig?.socialLinks).toMatchObject({
            facebook: 'https://www.facebook.com/njstore',
            instagram: 'https://www.instagram.com/njstore',
            tiktok: 'https://www.tiktok.com/@njstore',
            youtube: 'https://www.youtube.com/@njstore',
            x: 'https://x.com/njstore'
        });
        expect(storedConfig?.footer).toMatchObject({
            companyName: 'NJ Store',
            email: 'support@njstore.com',
            phone: '+94 11 245 8899',
            physicalAddress: '120 Galle Road, Colombo 03, Sri Lanka'
        });
        expect(storedConfig?.storeLogo).toMatchObject({
            publicId: 'njstore/site-config/store-logo',
            alt: 'NJ Store logo'
        });
        expect(storedConfig?.supportedCurrencies).toEqual([
            {
                code: 'LKR',
                symbol: 'LKR',
                rate: 1,
                isDefault: true
            },
            {
                code: 'USD',
                symbol: '$',
                rate: 0.0033,
                isDefault: false
            }
        ]);
        expect(storedConfig?.maintenanceMode).toMatchObject({
            enabled: true,
            message: 'Temporarily offline for inventory reconciliation.'
        });
        expect(storedConfig?.taxSettings).toMatchObject({
            enabled: true,
            label: 'VAT',
            rate: 18
        });
        expect(storedConfig?.notificationSettings).toMatchObject({
            quotationReady: { emailEnabled: true, smsEnabled: false },
            orderConfirmed: { emailEnabled: true, smsEnabled: false },
            orderShipped: { emailEnabled: true, smsEnabled: true },
            receiptRejected: { emailEnabled: true, smsEnabled: false },
            lowStockAlert: { emailEnabled: true, smsEnabled: true }
        });
        expect(storedConfig?.emailTemplates).toEqual([]);
        await expect(EmailTemplate.find().sort({ sortOrder: 1 }).lean()).resolves.toMatchObject([
            {
                type: 'order_confirmation',
                subject: 'Your order is confirmed',
                bodyHtml: '<h1>Thanks for shopping with us</h1>'
            }
        ]);
    }, TEST_TIMEOUT);
    it('backfills legacy email templates into the dedicated collection', async () => {
        await StoreSetting.create({
            emailTemplates: [
                {
                    type: 'quotation_ready',
                    subject: 'Quotation ready',
                    bodyHtml: '<p>Your quote is ready</p>'
                }
            ]
        });
        const config = await siteConfigService.getConfig();
        expect(config.emailTemplates).toEqual([
            {
                type: 'quotation_ready',
                subject: 'Quotation ready',
                bodyHtml: '<p>Your quote is ready</p>'
            }
        ]);
        await expect(EmailTemplate.findOne({ type: 'quotation_ready' }).lean()).resolves.toMatchObject({
            subject: 'Quotation ready',
            bodyHtml: '<p>Your quote is ready</p>'
        });
    }, TEST_TIMEOUT);
    it('rejects stale admin settings revisions', async () => {
        const initial = await siteConfigService.getConfig();
        const updated = await siteConfigService.updateConfig({
            revision: initial.revision,
            storeName: 'Revision One'
        });
        expect(updated.revision).toBe(initial.revision + 1);
        await expect(siteConfigService.updateConfig({
            revision: initial.revision,
            storeName: 'Stale Revision'
        })).rejects.toMatchObject({ statusCode: 409 });
        const current = await siteConfigService.getConfig();
        expect(current.storeName).toBe('Revision One');
    }, TEST_TIMEOUT);
    it('rejects unsafe map embed URLs and sanitizes legacy stored values', async () => {
        await expect(StoreSetting.create({
            footer: {
                mapEmbedUrl: 'https://evil.example/maps/embed?payload=<script>'
            }
        })).rejects.toThrow(/Google Maps HTTPS embed URL/);
        const legacyConfig = await StoreSetting.create({});
        await StoreSetting.collection.updateOne({ _id: legacyConfig._id }, {
            $set: {
                'footer.mapEmbedUrl': 'https://evil.example/maps/embed?payload=<script>',
                'footer.physicalAddress': '120 Galle Road, Colombo 03, Sri Lanka'
            }
        });
        const config = await siteConfigService.getConfig();
        expect(config.footer.mapEmbedUrl).toBe('https://www.google.com/maps?q=120+Galle+Road%2C+Colombo+03%2C+Sri+Lanka&output=embed');
    }, TEST_TIMEOUT);
});
