import type { SiteConfigDto } from '@njstore/types';
import type { FieldPath } from 'react-hook-form';
import {
  buildFooterPayload,
  buildStoreLogoDarkPayload,
  buildStoreLogoLightPayload,
  buildStoreLogoPayload,
  settingsSectionSchemas,
  type SettingsFormValues
} from './settingsSchema';

export type SettingsSectionKey = keyof typeof settingsSectionSchemas;

export const settingsSectionFieldNames: Record<SettingsSectionKey, FieldPath<SettingsFormValues>[]> = {
  operations: [
    'storeName',
    'storeLogoUrl',
    'storeLogoPublicId',
    'storeLogoAlt',
    'storeLogoDarkUrl',
    'storeLogoDarkPublicId',
    'storeLogoDarkAlt',
    'storeLogoLightUrl',
    'storeLogoLightPublicId',
    'storeLogoLightAlt',
    'supportedCurrencies',
    'freeShippingThreshold',
    'lowStockThreshold',
    'loyaltyPointsRate',
    'cancellationWindowHours',
    'quotationExpiryDays',
    'taxEnabled',
    'taxLabel',
    'taxRate'
  ],
  presence: [
    'footerLogoUrl',
    'footerLogoPublicId',
    'footerLogoAlt',
    'footerCompanyName',
    'footerDescription',
    'footerEmail',
    'footerPhone',
    'footerWhatsappNumber',
    'footerPhysicalAddress',
    'footerMapEmbedUrl',
    'footerLatitude',
    'footerLongitude',
    'footerOpeningHours',
    'footerCopyrightText',
    'footerFacebookUrl',
    'footerInstagramUrl',
    'footerTikTokUrl',
    'footerYouTubeUrl',
    'footerXUrl',
    'footerSectionAboutTitle',
    'footerSectionQuickLinksTitle',
    'footerSectionContactTitle',
    'footerSectionSocialTitle',
    'footerQuickLinks',
    'maintenanceEnabled',
    'maintenanceMessage'
  ],
  payments: ['accountName', 'bankName', 'branch', 'accountNumber', 'cashOnDeliveryEnabled'],
  shipping: ['shippingRates'],
  communications: ['notificationSettings', 'emailTemplates']
};

export const sectionFallbackErrorPath: Record<SettingsSectionKey, FieldPath<SettingsFormValues>> = {
  operations: 'supportedCurrencies',
  presence: 'footerCompanyName',
  payments: 'accountName',
  shipping: 'shippingRates',
  communications: 'notificationSettings'
};

export const settingsSectionLabels: Record<SettingsSectionKey, string> = {
  operations: 'Store Controls',
  presence: 'Storefront Presence',
  payments: 'Payments',
  shipping: 'Shipping',
  communications: 'Communications'
};

export const pickSectionValues = (
  section: SettingsSectionKey,
  values: SettingsFormValues
): Partial<SettingsFormValues> =>
  Object.fromEntries(settingsSectionFieldNames[section].map((fieldName) => [fieldName, values[fieldName as keyof SettingsFormValues]])) as Partial<SettingsFormValues>;

export const buildSettingsSectionPayload = (
  section: SettingsSectionKey,
  values: SettingsFormValues,
  revision: number
): Partial<SiteConfigDto> => {
  if (section === 'operations') {
    return {
      revision,
      storeName: values.storeName,
      storeLogo: buildStoreLogoPayload(values),
      storeLogoDark: buildStoreLogoDarkPayload(values),
      storeLogoLight: buildStoreLogoLightPayload(values),
      supportedCurrencies: values.supportedCurrencies.map((currency) => ({
        code: currency.code.trim().toUpperCase(),
        symbol: currency.symbol.trim(),
        rate: currency.code.trim().toUpperCase() === 'LKR' ? 1 : currency.rate,
        isDefault: Boolean(currency.isDefault)
      })),
      freeShippingThreshold: values.freeShippingThreshold,
      lowStockThreshold: values.lowStockThreshold,
      loyaltyPointsRate: values.loyaltyPointsRate,
      cancellationWindowHours: values.cancellationWindowHours,
      quotationExpiryDays: values.quotationExpiryDays,
      taxSettings: {
        enabled: values.taxEnabled,
        label: values.taxLabel,
        rate: values.taxRate
      }
    };
  }

  if (section === 'presence') {
    const footerPayload = buildFooterPayload(values);

    return {
      revision,
      supportPhoneNumber: footerPayload.phone,
      whatsappNumber: footerPayload.whatsappNumber,
      socialLinks: footerPayload.socialLinks,
      footer: footerPayload,
      maintenanceMode: {
        enabled: values.maintenanceEnabled,
        message: values.maintenanceMessage
      }
    };
  }

  if (section === 'payments') {
    return {
      revision,
      bankTransferDetails: {
        accountName: values.accountName,
        bankName: values.bankName,
        branch: values.branch,
        accountNumber: values.accountNumber
      },
      cashOnDeliveryEnabled: values.cashOnDeliveryEnabled
    };
  }

  if (section === 'shipping') {
    return {
      revision,
      shippingRates: values.shippingRates
    };
  }

  return {
    revision,
    notificationSettings: values.notificationSettings,
    emailTemplates: values.emailTemplates
  };
};
