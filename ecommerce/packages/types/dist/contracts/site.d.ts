import type { AddressDto, ImageAsset } from './common.js';
export interface EmailTemplateDto {
    type: string;
    subject: string;
    bodyHtml: string;
}
export interface ShippingRateDto {
    city: string;
    fee: number;
    days: string;
}
export interface BankTransferDetailsDto {
    accountName: string;
    bankName: string;
    branch: string;
    accountNumber: string;
}
export interface SocialLinksDto {
    facebook: string;
    instagram: string;
    tiktok?: string;
    youtube?: string;
    x?: string;
}
export interface FooterSocialLinksDto {
    facebook: string;
    instagram: string;
    tiktok: string;
    youtube: string;
    x: string;
}
export interface FooterSectionTitlesDto {
    about: string;
    quickLinks: string;
    contact: string;
    social: string;
}
export interface FooterQuickLinkDto {
    label: string;
    href: string;
}
export interface FooterSettingsDto {
    companyName: string;
    logo?: ImageAsset | null;
    description: string;
    email: string;
    phone: string;
    whatsappNumber: string;
    physicalAddress: string;
    mapEmbedUrl: string;
    latitude?: number;
    longitude?: number;
    openingHours?: string;
    copyrightText: string;
    socialLinks: FooterSocialLinksDto;
    sectionTitles: FooterSectionTitlesDto;
    quickLinks: FooterQuickLinkDto[];
}
export interface MaintenanceModeDto {
    enabled: boolean;
    message: string;
}
export interface TaxSettingsDto {
    enabled: boolean;
    label: string;
    rate: number;
}
export interface NotificationChannelSettingsDto {
    emailEnabled: boolean;
    smsEnabled: boolean;
}
export interface NotificationSettingsDto {
    quotationReady: NotificationChannelSettingsDto;
    orderConfirmed: NotificationChannelSettingsDto;
    orderShipped: NotificationChannelSettingsDto;
    receiptRejected: NotificationChannelSettingsDto;
    lowStockAlert: NotificationChannelSettingsDto;
}
export interface CurrencyRateDto {
    code: string;
    symbol: string;
    rate: number;
    isDefault?: boolean;
}
export interface SiteConfigDto {
    id: string;
    revision: number;
    storeName: string;
    storeLogo?: ImageAsset | null;
    storeLogoDark?: ImageAsset | null;
    storeLogoLight?: ImageAsset | null;
    supportPhoneNumber: string;
    whatsappNumber: string;
    freeShippingThreshold: number;
    lowStockThreshold: number;
    shippingRates: ShippingRateDto[];
    loyaltyPointsRate: number;
    cancellationWindowHours: number;
    quotationExpiryDays: number;
    cashOnDeliveryEnabled?: boolean;
    bankTransferDetails: BankTransferDetailsDto;
    storeAddress?: AddressDto;
    emailTemplates: EmailTemplateDto[];
    supportedCurrencies?: CurrencyRateDto[];
    socialLinks?: SocialLinksDto;
    footer?: FooterSettingsDto;
    maintenanceMode?: MaintenanceModeDto;
    taxSettings?: TaxSettingsDto;
    notificationSettings?: NotificationSettingsDto;
}
