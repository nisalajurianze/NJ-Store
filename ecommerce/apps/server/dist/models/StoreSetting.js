import { Schema, model } from 'mongoose';
import { buildDefaultFooterSettings, defaultFooterQuickLinks, defaultFooterSectionTitles, defaultFooterSocialLinks, isAllowedMapEmbedUrl } from '../utils/footerDefaults.js';
const shippingRateSchema = new Schema({
    city: { type: String, required: true, trim: true },
    fee: { type: Number, required: true, min: 0 },
    days: { type: String, required: true, trim: true }
}, { _id: false });
const emailTemplateSchema = new Schema({
    type: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    bodyHtml: { type: String, required: true, trim: true }
}, { _id: false });
const socialLinksSchema = new Schema({
    facebook: { type: String, default: '', trim: true },
    instagram: { type: String, default: '', trim: true },
    tiktok: { type: String, default: '', trim: true },
    youtube: { type: String, default: '', trim: true },
    x: { type: String, default: '', trim: true }
}, { _id: false });
const footerQuickLinkSchema = new Schema({
    label: { type: String, required: true, trim: true },
    href: { type: String, required: true, trim: true }
}, { _id: false });
const footerSectionTitlesSchema = new Schema({
    about: { type: String, default: 'About', trim: true },
    quickLinks: { type: String, default: 'Quick Links', trim: true },
    contact: { type: String, default: 'Contact Info', trim: true },
    social: { type: String, default: 'Social & Updates', trim: true }
}, { _id: false });
const footerSettingsSchema = new Schema({
    companyName: { type: String, default: 'NJ Store', trim: true },
    logo: {
        url: { type: String, trim: true },
        publicId: { type: String, trim: true },
        alt: { type: String, trim: true }
    },
    description: {
        type: String,
        default: 'Premium electronics, responsive service, and transparent custom quotations.',
        trim: true
    },
    email: { type: String, default: 'support@njstore.com', trim: true },
    phone: { type: String, default: '+94 11 245 8899', trim: true },
    whatsappNumber: { type: String, default: '94112458899', trim: true },
    physicalAddress: { type: String, default: '120 Galle Road, Colombo 03, Sri Lanka', trim: true },
    mapEmbedUrl: {
        type: String,
        default: 'https://www.google.com/maps?q=Colombo%2003%20Sri%20Lanka&output=embed',
        trim: true,
        validate: {
            validator: (value) => !value || isAllowedMapEmbedUrl(value),
            message: 'Map embed URL must be a Google Maps HTTPS embed URL that includes /maps/embed or output=embed.'
        }
    },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    openingHours: { type: String, default: 'Mon-Sat, 9:00 AM to 6:00 PM', trim: true },
    copyrightText: { type: String, default: '© NJ Store. All rights reserved.', trim: true },
    socialLinks: { type: socialLinksSchema, default: defaultFooterSocialLinks },
    sectionTitles: { type: footerSectionTitlesSchema, default: defaultFooterSectionTitles },
    quickLinks: { type: [footerQuickLinkSchema], default: defaultFooterQuickLinks }
}, { _id: false });
const maintenanceModeSchema = new Schema({
    enabled: { type: Boolean, default: false },
    message: {
        type: String,
        default: "We're making a few improvements right now. Please check back shortly.",
        trim: true
    }
}, { _id: false });
const taxSettingsSchema = new Schema({
    enabled: { type: Boolean, default: false },
    label: { type: String, default: 'VAT', trim: true },
    rate: { type: Number, default: 0, min: 0 }
}, { _id: false });
const notificationChannelSettingsSchema = new Schema({
    emailEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: false }
}, { _id: false });
const notificationSettingsSchema = new Schema({
    quotationReady: { type: notificationChannelSettingsSchema, default: () => ({}) },
    orderConfirmed: { type: notificationChannelSettingsSchema, default: () => ({}) },
    orderShipped: { type: notificationChannelSettingsSchema, default: () => ({}) },
    receiptRejected: { type: notificationChannelSettingsSchema, default: () => ({}) },
    lowStockAlert: { type: notificationChannelSettingsSchema, default: () => ({}) }
}, { _id: false });
const currencyRateSchema = new Schema({
    code: { type: String, required: true, trim: true, uppercase: true },
    symbol: { type: String, required: true, trim: true },
    rate: { type: Number, required: true, min: 0.0001 },
    isDefault: { type: Boolean, default: false }
}, { _id: false });
const manualExpenseSchema = new Schema({
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    incurredOn: { type: Date, required: true },
    category: { type: String, default: 'Operations', trim: true },
    notes: { type: String, trim: true }
}, { timestamps: true });
const storeSettingSchema = new Schema({
    freeShippingThreshold: { type: Number, default: 15000, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    loyaltyPointsRate: { type: Number, default: 100, min: 1 },
    cancellationWindowHours: { type: Number, default: 2, min: 0 },
    quotationExpiryDays: { type: Number, default: 7, min: 1 },
    cashOnDeliveryEnabled: { type: Boolean, default: true },
    shippingRates: {
        type: [shippingRateSchema],
        default: [],
        validate: {
            validator: (v) => v.length <= 100,
            message: 'Cannot exceed 100 shipping rates'
        }
    },
    storeName: { type: String, default: 'NJ Store', trim: true },
    storeLogo: {
        url: { type: String, trim: true },
        publicId: { type: String, trim: true },
        alt: { type: String, trim: true }
    },
    storeLogoDark: {
        url: { type: String, trim: true },
        publicId: { type: String, trim: true },
        alt: { type: String, trim: true }
    },
    storeLogoLight: {
        url: { type: String, trim: true },
        publicId: { type: String, trim: true },
        alt: { type: String, trim: true }
    },
    supportPhoneNumber: { type: String, default: '+94 11 245 8899', trim: true },
    whatsappNumber: { type: String, default: '94112458899', trim: true },
    socialLinks: { type: socialLinksSchema, default: () => ({}) },
    footer: { type: footerSettingsSchema, default: buildDefaultFooterSettings },
    supportedCurrencies: {
        type: [currencyRateSchema],
        default: () => [{ code: 'LKR', symbol: 'LKR', rate: 1, isDefault: true }]
    },
    bankTransferDetails: {
        accountName: { type: String, default: 'NJ Store (Pvt) Ltd', trim: true },
        bankName: { type: String, default: 'Commercial Bank', trim: true },
        branch: { type: String, default: 'Colombo Fort', trim: true },
        accountNumber: { type: String, default: '1234567890', trim: true }
    },
    maintenanceMode: { type: maintenanceModeSchema, default: () => ({}) },
    taxSettings: { type: taxSettingsSchema, default: () => ({}) },
    notificationSettings: { type: notificationSettingsSchema, default: () => ({}) },
    manualExpenses: {
        type: [manualExpenseSchema],
        default: [],
        validate: {
            validator: (v) => v.length <= 500,
            message: 'Cannot exceed 500 manual expenses. Archive older entries.'
        }
    },
    emailTemplates: {
        type: [emailTemplateSchema],
        default: [],
        validate: {
            validator: (v) => v.length <= 50,
            message: 'Cannot exceed 50 email templates'
        }
    }
}, { timestamps: true });
export const StoreSetting = model('StoreSetting', storeSettingSchema);
