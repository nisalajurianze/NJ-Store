import type { FooterSettingsDto, SiteConfigDto } from '@njstore/types';
import { EmailTemplate } from '../models/EmailTemplate.js';
import { StoreSetting } from '../models/StoreSetting.js';
import { StoreSettingVersion } from '../models/StoreSettingVersion.js';
import { cacheNamespaces, cacheService } from './cacheService.js';
import { serializeSiteConfig } from '../utils/serializers.js';
import { removeAsset } from './uploadService.js';
import { buildDefaultFooterSettings, buildFooterMapEmbedUrl } from '../utils/footerDefaults.js';
import { AppError } from '../utils/AppError.js';

const defaultShippingRates = [
  { city: 'Colombo', fee: 350, days: '2-3' },
  { city: 'Gampaha', fee: 350, days: '2-3' },
  { city: 'Kalutara', fee: 400, days: '2-3' },
  { city: 'Kandy', fee: 500, days: '4-5' },
  { city: 'Galle', fee: 500, days: '4-5' },
  { city: 'Matara', fee: 550, days: '4-6' },
  { city: 'default', fee: 600, days: '4-6' }
];

const SITE_CONFIG_CACHE_TTL_SECONDS = 10 * 60;
const REVISION_PAYLOAD_KEY = 'revision';
type EmailTemplateInput = NonNullable<SiteConfigDto['emailTemplates']>[number];

const normalizeEmailTemplates = (templates: EmailTemplateInput[] = []): EmailTemplateInput[] => {
  const byType = new Map<string, EmailTemplateInput>();

  templates.forEach((template) => {
    const type = template.type.trim();
    if (!type) {
      return;
    }

    byType.set(type, {
      type,
      subject: template.subject.trim(),
      bodyHtml: template.bodyHtml.trim()
    });
  });

  return [...byType.values()];
};

const readLegacyEmailTemplates = (config: { get: (path: string) => unknown }): EmailTemplateInput[] =>
  normalizeEmailTemplates((config.get('emailTemplates') as EmailTemplateInput[] | undefined) ?? []);

const replaceEmailTemplates = async (templates: EmailTemplateInput[]): Promise<void> => {
  const normalizedTemplates = normalizeEmailTemplates(templates);
  const templateTypes = normalizedTemplates.map((template) => template.type);

  await EmailTemplate.deleteMany({ type: { $nin: templateTypes } });

  if (normalizedTemplates.length === 0) {
    return;
  }

  await EmailTemplate.bulkWrite(
    normalizedTemplates.map((template, index) => ({
      updateOne: {
        filter: { type: template.type },
        update: {
          $set: {
            subject: template.subject,
            bodyHtml: template.bodyHtml,
            sortOrder: index
          },
          $setOnInsert: { type: template.type }
        },
        upsert: true
      }
    }))
  );
};

const listEmailTemplatesWithFallback = async (config: { get: (path: string) => unknown }): Promise<EmailTemplateInput[]> => {
  const emailTemplates = await EmailTemplate.find().sort({ sortOrder: 1, type: 1 }).lean();
  if (emailTemplates.length > 0) {
    return emailTemplates.map((template) => ({
      type: template.type,
      subject: template.subject,
      bodyHtml: template.bodyHtml
    }));
  }

  const legacyTemplates = readLegacyEmailTemplates(config);
  if (legacyTemplates.length > 0) {
    await replaceEmailTemplates(legacyTemplates);
  }

  return legacyTemplates;
};

const getCurrentSettingRevision = async (settingId: unknown): Promise<number> => {
  const latestVersion = await StoreSettingVersion.findOne({ setting: settingId }).sort({ version: -1 }).select('version').lean<{ version: number } | null>();
  return latestVersion?.version ?? 0;
};

const recordSettingVersion = async (config: { _id: unknown; toObject: () => Record<string, unknown> }, changeKeys: string[]): Promise<void> => {
  const latestVersion = await StoreSettingVersion.findOne({ setting: config._id }).sort({ version: -1 }).select('version').lean<{ version: number } | null>();
  await StoreSettingVersion.create({
    setting: config._id,
    version: (latestVersion?.version ?? 0) + 1,
    changeKeys,
    snapshot: config.toObject()
  });
};

const serializeConfigWithDynamicSettings = async (config: {
  toObject: () => Record<string, unknown>;
  get: (path: string) => unknown;
}): Promise<SiteConfigDto> => {
  const emailTemplates = await listEmailTemplatesWithFallback(config);
  const revision = await getCurrentSettingRevision(config.get('_id'));
  return serializeSiteConfig({
    ...config.toObject(),
    revision,
    emailTemplates
  } as Parameters<typeof serializeSiteConfig>[0]);
};

export const siteConfigService = {
  getOrCreateDocument: async () => {
    let config = await StoreSetting.findOne();
    if (!config) {
      config = await StoreSetting.create({
        shippingRates: defaultShippingRates
      });
    }
    return config;
  },

  getConfig: async (): Promise<SiteConfigDto> =>
    cacheService.rememberVersioned(cacheNamespaces.siteConfig, 'public', SITE_CONFIG_CACHE_TTL_SECONDS, async () => {
      const config = await siteConfigService.getOrCreateDocument();
      return serializeConfigWithDynamicSettings(config);
    }),

  getFooter: async (): Promise<FooterSettingsDto> => {
    const config = await siteConfigService.getConfig();
    return config.footer ?? buildDefaultFooterSettings();
  },

  updateConfig: async (payload: Partial<SiteConfigDto>): Promise<SiteConfigDto> => {
    const config = await siteConfigService.getOrCreateDocument();
    const currentRevision = await getCurrentSettingRevision(config._id);
    if (payload.revision !== undefined && payload.revision !== currentRevision) {
      throw new AppError('Store settings changed after this page loaded. Refresh and try again.', 409);
    }

    const currentConfig = serializeSiteConfig(config.toObject());
    const currentFooter = currentConfig.footer ?? buildDefaultFooterSettings();
    const changeKeys = Object.keys(payload)
      .filter((key) => key !== REVISION_PAYLOAD_KEY)
      .sort();

    if (payload.storeName !== undefined) {
      config.storeName = payload.storeName;

      if (currentFooter.companyName === currentConfig.storeName) {
        config.set('footer.companyName', payload.storeName);
      }
    }
    const nextStoreLogoPublicIds = new Set(
      [
        payload.storeLogo === undefined ? config.storeLogo?.publicId : payload.storeLogo?.publicId,
        payload.storeLogoDark === undefined ? config.storeLogoDark?.publicId : payload.storeLogoDark?.publicId,
        payload.storeLogoLight === undefined ? config.storeLogoLight?.publicId : payload.storeLogoLight?.publicId
      ].filter(Boolean)
    );

    if (payload.storeLogo !== undefined) {
      const currentStoreLogoPublicId = config.storeLogo?.publicId;
      const nextStoreLogoPublicId = payload.storeLogo?.publicId;

      if (currentStoreLogoPublicId && currentStoreLogoPublicId !== nextStoreLogoPublicId && !nextStoreLogoPublicIds.has(currentStoreLogoPublicId)) {
        await removeAsset(currentStoreLogoPublicId);
      }

      config.set('storeLogo', payload.storeLogo ?? undefined);
    }
    if (payload.storeLogoDark !== undefined) {
      const currentStoreLogoPublicId = config.storeLogoDark?.publicId;
      const nextStoreLogoPublicId = payload.storeLogoDark?.publicId;

      if (currentStoreLogoPublicId && currentStoreLogoPublicId !== nextStoreLogoPublicId && !nextStoreLogoPublicIds.has(currentStoreLogoPublicId)) {
        await removeAsset(currentStoreLogoPublicId);
      }

      config.set('storeLogoDark', payload.storeLogoDark ?? undefined);
    }
    if (payload.storeLogoLight !== undefined) {
      const currentStoreLogoPublicId = config.storeLogoLight?.publicId;
      const nextStoreLogoPublicId = payload.storeLogoLight?.publicId;

      if (currentStoreLogoPublicId && currentStoreLogoPublicId !== nextStoreLogoPublicId && !nextStoreLogoPublicIds.has(currentStoreLogoPublicId)) {
        await removeAsset(currentStoreLogoPublicId);
      }

      config.set('storeLogoLight', payload.storeLogoLight ?? undefined);
    }
    if (payload.supportPhoneNumber !== undefined) {
      config.supportPhoneNumber = payload.supportPhoneNumber;
      config.set('footer.phone', payload.supportPhoneNumber);
    }
    if (payload.whatsappNumber !== undefined) {
      config.whatsappNumber = payload.whatsappNumber;
      config.set('footer.whatsappNumber', payload.whatsappNumber);
    }
    if (payload.freeShippingThreshold !== undefined) {
      config.freeShippingThreshold = payload.freeShippingThreshold;
    }
    if (payload.lowStockThreshold !== undefined) {
      config.lowStockThreshold = payload.lowStockThreshold;
    }
    if (payload.shippingRates !== undefined) {
      config.set('shippingRates', payload.shippingRates as any);
    }
    if (payload.bankTransferDetails !== undefined) {
      config.set('bankTransferDetails', payload.bankTransferDetails as any);
    }
    if (payload.socialLinks !== undefined) {
      config.set('socialLinks', payload.socialLinks as any);
      config.set('footer.socialLinks', {
        ...currentFooter.socialLinks,
        ...payload.socialLinks
      } as any);
    }
    if (payload.footer !== undefined) {
      const nextFooter = {
        ...currentFooter,
        ...payload.footer,
        socialLinks: {
          ...currentFooter.socialLinks,
          ...payload.footer.socialLinks
        },
        sectionTitles: {
          ...currentFooter.sectionTitles,
          ...payload.footer.sectionTitles
        },
        quickLinks: payload.footer.quickLinks ?? currentFooter.quickLinks
      };
      nextFooter.mapEmbedUrl = buildFooterMapEmbedUrl(nextFooter);
      const currentFooterLogoPublicId = currentFooter.logo?.publicId;
      const nextFooterLogoPublicId = nextFooter.logo?.publicId;

      if (currentFooterLogoPublicId && currentFooterLogoPublicId !== nextFooterLogoPublicId) {
        await removeAsset(currentFooterLogoPublicId);
      }

      config.set('footer', nextFooter as any);
      config.supportPhoneNumber = nextFooter.phone;
      config.whatsappNumber = nextFooter.whatsappNumber;
      config.set('socialLinks', nextFooter.socialLinks as any);
    }
    if (payload.supportedCurrencies !== undefined) {
      config.set('supportedCurrencies', payload.supportedCurrencies as any);
    }
    if (payload.maintenanceMode !== undefined) {
      config.set('maintenanceMode', payload.maintenanceMode as any);
    }
    if (payload.taxSettings !== undefined) {
      config.set('taxSettings', payload.taxSettings as any);
    }
    if (payload.notificationSettings !== undefined) {
      config.set('notificationSettings', payload.notificationSettings as any);
    }
    if (payload.loyaltyPointsRate !== undefined) {
      config.loyaltyPointsRate = payload.loyaltyPointsRate;
    }
    if (payload.cancellationWindowHours !== undefined) {
      config.cancellationWindowHours = payload.cancellationWindowHours;
    }
    if (payload.quotationExpiryDays !== undefined) {
      config.quotationExpiryDays = payload.quotationExpiryDays;
    }
    if (payload.cashOnDeliveryEnabled !== undefined) {
      config.cashOnDeliveryEnabled = payload.cashOnDeliveryEnabled;
    }
    if (payload.emailTemplates !== undefined) {
      await replaceEmailTemplates(payload.emailTemplates);
      config.set('emailTemplates', []);
    }
    await config.save();
    await recordSettingVersion(config, changeKeys);
    await Promise.all([
      cacheService.bumpNamespace(cacheNamespaces.siteConfig),
      cacheService.bumpNamespace(cacheNamespaces.analytics)
    ]);
    return serializeConfigWithDynamicSettings(config);
  },

  updateFooter: async (payload: FooterSettingsDto): Promise<FooterSettingsDto> => {
    const config = await siteConfigService.updateConfig({ footer: payload });
    return config.footer ?? buildDefaultFooterSettings();
  }
};
