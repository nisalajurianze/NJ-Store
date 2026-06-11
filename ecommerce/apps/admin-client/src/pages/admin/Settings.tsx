import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useFieldArray, useForm, type FieldPath } from 'react-hook-form';
import { ImagePlus, Plus, Trash2, Upload } from 'lucide-react';
import { Badge, Button, Input, Textarea } from '@njstore/ui';
import toast from 'react-hot-toast';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { adminService } from '../../services/adminService';
import { AdminPageHeader, AdminStatGrid, AdminSurfacePanel } from '../../components/ui/AdminSurface';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  defaultFooterAddress,
  defaultFooterCopyright,
  defaultFooterDescription,
  defaultFooterEmail,
  defaultFooterMapEmbedUrl,
  defaultFooterQuickLinks,
  defaultFooterSectionTitles,
  defaultMaintenanceMessage,
  defaultNotificationSettings,
  defaultSupportedCurrencies,
  defaultTaxLabel,
  notificationRuleDefinitions,
  settingsSchema,
  settingsSectionSchemas,
  type SettingsFormValues
} from './settingsSchema';
import {
  buildSettingsSectionPayload,
  pickSectionValues,
  sectionFallbackErrorPath,
  settingsSectionFieldNames,
  settingsSectionLabels,
  type SettingsSectionKey
} from './settingsSections';

const ADMIN_SETTINGS_STALE_TIME_MS = 5 * 60_000;

export const Settings = (): JSX.Element => {
  const { hasPermissions } = useAdminPermissions();
  const settings = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminService.settings(),
    staleTime: ADMIN_SETTINGS_STALE_TIME_MS
  });
  const config = settings.data?.data;
  const canWriteSettings = hasPermissions('setting:write');
  const [isUploadingStoreLogoDark, setIsUploadingStoreLogoDark] = useState(false);
  const [isUploadingStoreLogoLight, setIsUploadingStoreLogoLight] = useState(false);
  const [isUploadingFooterLogo, setIsUploadingFooterLogo] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSectionKey>('operations');
  const [savingSection, setSavingSection] = useState<SettingsSectionKey | null>(null);
  const storeLogoDarkInputRef = useRef<HTMLInputElement | null>(null);
  const storeLogoLightInputRef = useRef<HTMLInputElement | null>(null);
  const footerLogoInputRef = useRef<HTMLInputElement | null>(null);
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      storeName: '',
      storeLogoUrl: '',
      storeLogoPublicId: '',
      storeLogoAlt: '',
      storeLogoDarkUrl: '',
      storeLogoDarkPublicId: '',
      storeLogoDarkAlt: '',
      storeLogoLightUrl: '',
      storeLogoLightPublicId: '',
      storeLogoLightAlt: '',
      footerLogoUrl: '',
      footerLogoPublicId: '',
      footerLogoAlt: '',
      footerCompanyName: 'NJ Store',
      footerDescription: defaultFooterDescription,
      footerEmail: defaultFooterEmail,
      footerPhone: '+94 11 245 8899',
      footerWhatsappNumber: '94112458899',
      footerPhysicalAddress: defaultFooterAddress,
      footerMapEmbedUrl: defaultFooterMapEmbedUrl,
      footerLatitude: undefined,
      footerLongitude: undefined,
      footerOpeningHours: 'Mon-Sat, 9:00 AM to 6:00 PM',
      footerCopyrightText: defaultFooterCopyright,
      footerFacebookUrl: '',
      footerInstagramUrl: '',
      footerTikTokUrl: '',
      footerYouTubeUrl: '',
      footerXUrl: '',
      footerSectionAboutTitle: defaultFooterSectionTitles.about,
      footerSectionQuickLinksTitle: defaultFooterSectionTitles.quickLinks,
      footerSectionContactTitle: defaultFooterSectionTitles.contact,
      footerSectionSocialTitle: defaultFooterSectionTitles.social,
      footerQuickLinks: defaultFooterQuickLinks.map((link) => ({ ...link })),
      supportedCurrencies: defaultSupportedCurrencies,
      freeShippingThreshold: 15000,
      lowStockThreshold: 5,
      loyaltyPointsRate: 100,
      cancellationWindowHours: 2,
      quotationExpiryDays: 7,
      taxEnabled: false,
      taxLabel: defaultTaxLabel,
      taxRate: 0,
      cashOnDeliveryEnabled: true,
      maintenanceEnabled: false,
      maintenanceMessage: defaultMaintenanceMessage,
      notificationSettings: defaultNotificationSettings,
      accountName: '',
      bankName: '',
      branch: '',
      accountNumber: '',
      shippingRates: [],
      emailTemplates: []
    }
  });

  const { fields: shippingFields, append: appendShipping, remove: removeShipping } = useFieldArray({
    control: form.control,
    name: 'shippingRates'
  });

  const { fields: emailFields, append: appendEmail, remove: removeEmail } = useFieldArray({
    control: form.control,
    name: 'emailTemplates'
  });

  const { fields: currencyFields, append: appendCurrency, remove: removeCurrency } = useFieldArray({
    control: form.control,
    name: 'supportedCurrencies'
  });

  const { fields: footerQuickLinkFields, append: appendFooterQuickLink, remove: removeFooterQuickLink } = useFieldArray({
    control: form.control,
    name: 'footerQuickLinks'
  });

  const maintenanceEnabled = form.watch('maintenanceEnabled');
  const taxEnabled = form.watch('taxEnabled');
  const supportedCurrencies = form.watch('supportedCurrencies');
  const watchedStoreLogoDarkUrl = form.watch('storeLogoDarkUrl');
  const watchedStoreLogoDarkAlt = form.watch('storeLogoDarkAlt');
  const watchedStoreLogoLightUrl = form.watch('storeLogoLightUrl');
  const watchedStoreLogoLightAlt = form.watch('storeLogoLightAlt');
  const watchedFooterLogoUrl = form.watch('footerLogoUrl');
  const watchedFooterLogoAlt = form.watch('footerLogoAlt');

  useEffect(() => {
    if (!config) {
      return;
    }
    const footer = config.footer;

    form.reset({
      storeName: config.storeName,
      storeLogoUrl: config.storeLogo?.url ?? '',
      storeLogoPublicId: config.storeLogo?.publicId ?? '',
      storeLogoAlt: config.storeLogo?.alt ?? '',
      storeLogoDarkUrl: config.storeLogoDark?.url ?? config.storeLogo?.url ?? '',
      storeLogoDarkPublicId: config.storeLogoDark?.publicId ?? config.storeLogo?.publicId ?? '',
      storeLogoDarkAlt: config.storeLogoDark?.alt ?? config.storeLogo?.alt ?? '',
      storeLogoLightUrl: config.storeLogoLight?.url ?? '',
      storeLogoLightPublicId: config.storeLogoLight?.publicId ?? '',
      storeLogoLightAlt: config.storeLogoLight?.alt ?? '',
      footerLogoUrl: footer?.logo?.url ?? '',
      footerLogoPublicId: footer?.logo?.publicId ?? '',
      footerLogoAlt: footer?.logo?.alt ?? '',
      footerCompanyName: footer?.companyName ?? config.storeName,
      footerDescription: footer?.description ?? defaultFooterDescription,
      footerEmail: footer?.email ?? defaultFooterEmail,
      footerPhone: footer?.phone ?? config.supportPhoneNumber ?? '+94 11 245 8899',
      footerWhatsappNumber: footer?.whatsappNumber ?? config.whatsappNumber ?? '94112458899',
      footerPhysicalAddress: footer?.physicalAddress ?? defaultFooterAddress,
      footerMapEmbedUrl: footer?.mapEmbedUrl ?? defaultFooterMapEmbedUrl,
      footerLatitude: footer?.latitude,
      footerLongitude: footer?.longitude,
      footerOpeningHours: footer?.openingHours ?? 'Mon-Sat, 9:00 AM to 6:00 PM',
      footerCopyrightText: footer?.copyrightText ?? defaultFooterCopyright,
      footerFacebookUrl: footer?.socialLinks?.facebook ?? config.socialLinks?.facebook ?? '',
      footerInstagramUrl: footer?.socialLinks?.instagram ?? config.socialLinks?.instagram ?? '',
      footerTikTokUrl: footer?.socialLinks?.tiktok ?? config.socialLinks?.tiktok ?? '',
      footerYouTubeUrl: footer?.socialLinks?.youtube ?? config.socialLinks?.youtube ?? '',
      footerXUrl: footer?.socialLinks?.x ?? config.socialLinks?.x ?? '',
      footerSectionAboutTitle: footer?.sectionTitles?.about ?? defaultFooterSectionTitles.about,
      footerSectionQuickLinksTitle: footer?.sectionTitles?.quickLinks ?? defaultFooterSectionTitles.quickLinks,
      footerSectionContactTitle: footer?.sectionTitles?.contact ?? defaultFooterSectionTitles.contact,
      footerSectionSocialTitle: footer?.sectionTitles?.social ?? defaultFooterSectionTitles.social,
      footerQuickLinks: footer?.quickLinks?.length ? footer.quickLinks : defaultFooterQuickLinks.map((link) => ({ ...link })),
      supportedCurrencies: config.supportedCurrencies?.length ? config.supportedCurrencies : defaultSupportedCurrencies,
      freeShippingThreshold: config.freeShippingThreshold,
      lowStockThreshold: config.lowStockThreshold,
      loyaltyPointsRate: config.loyaltyPointsRate,
      cancellationWindowHours: config.cancellationWindowHours,
      quotationExpiryDays: config.quotationExpiryDays,
      taxEnabled: config.taxSettings?.enabled ?? false,
      taxLabel: config.taxSettings?.label ?? defaultTaxLabel,
      taxRate: config.taxSettings?.rate ?? 0,
      cashOnDeliveryEnabled: config.cashOnDeliveryEnabled ?? true,
      maintenanceEnabled: config.maintenanceMode?.enabled ?? false,
      maintenanceMessage: config.maintenanceMode?.message ?? defaultMaintenanceMessage,
      notificationSettings: {
        quotationReady: config.notificationSettings?.quotationReady ?? defaultNotificationSettings.quotationReady,
        orderConfirmed: config.notificationSettings?.orderConfirmed ?? defaultNotificationSettings.orderConfirmed,
        orderShipped: config.notificationSettings?.orderShipped ?? defaultNotificationSettings.orderShipped,
        receiptRejected: config.notificationSettings?.receiptRejected ?? defaultNotificationSettings.receiptRejected,
        lowStockAlert: config.notificationSettings?.lowStockAlert ?? defaultNotificationSettings.lowStockAlert
      },
      accountName: config.bankTransferDetails.accountName,
      bankName: config.bankTransferDetails.bankName,
      branch: config.bankTransferDetails.branch,
      accountNumber: config.bankTransferDetails.accountNumber,
      shippingRates: config.shippingRates ?? [],
      emailTemplates: config.emailTemplates ?? []
    });
  }, [config, form]);

  const handleUploadStoreLogoDark = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsUploadingStoreLogoDark(true);
      const uploaded = await adminService.uploadStoreLogo(file, form.getValues('storeLogoDarkAlt'));
      form.setValue('storeLogoDarkUrl', uploaded.data.url, { shouldDirty: true, shouldValidate: true });
      form.setValue('storeLogoDarkPublicId', uploaded.data.publicId, { shouldDirty: true });
      form.setValue('storeLogoDarkAlt', uploaded.data.alt ?? file.name, { shouldDirty: true });
      toast.success('Dark mode logo uploaded');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to upload this dark mode logo right now.'));
    } finally {
      setIsUploadingStoreLogoDark(false);
      if (storeLogoDarkInputRef.current) {
        storeLogoDarkInputRef.current.value = '';
      }
    }
  };

  const handleUploadStoreLogoLight = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsUploadingStoreLogoLight(true);
      const uploaded = await adminService.uploadStoreLogo(file, form.getValues('storeLogoLightAlt'));
      form.setValue('storeLogoLightUrl', uploaded.data.url, { shouldDirty: true, shouldValidate: true });
      form.setValue('storeLogoLightPublicId', uploaded.data.publicId, { shouldDirty: true });
      form.setValue('storeLogoLightAlt', uploaded.data.alt ?? file.name, { shouldDirty: true });
      toast.success('Light mode logo uploaded');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to upload this light mode logo right now.'));
    } finally {
      setIsUploadingStoreLogoLight(false);
      if (storeLogoLightInputRef.current) {
        storeLogoLightInputRef.current.value = '';
      }
    }
  };

  const handleUploadFooterLogo = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsUploadingFooterLogo(true);
      const uploaded = await adminService.uploadStoreLogo(file, form.getValues('footerLogoAlt'));
      form.setValue('footerLogoUrl', uploaded.data.url, { shouldDirty: true, shouldValidate: true });
      form.setValue('footerLogoPublicId', uploaded.data.publicId, { shouldDirty: true });
      form.setValue('footerLogoAlt', uploaded.data.alt ?? file.name, { shouldDirty: true });
      toast.success('Footer logo uploaded');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to upload this footer logo right now.'));
    } finally {
      setIsUploadingFooterLogo(false);
      if (footerLogoInputRef.current) {
        footerLogoInputRef.current.value = '';
      }
    }
  };

  const setDefaultCurrency = (index: number): void => {
    const nextCurrencies = form.getValues('supportedCurrencies').map((currency, currencyIndex) => ({
      ...currency,
      code: currency.code.trim().toUpperCase(),
      rate: currency.code.trim().toUpperCase() === 'LKR' ? 1 : currency.rate,
      isDefault: currencyIndex === index
    }));

    form.setValue('supportedCurrencies', nextCurrencies, {
      shouldDirty: true,
      shouldValidate: true
    });
  };

  const validateActiveSection = (): SettingsFormValues | null => {
    const rawValues = form.getValues();
    const result = settingsSectionSchemas[activeSection].safeParse(pickSectionValues(activeSection, rawValues));

    form.clearErrors(settingsSectionFieldNames[activeSection]);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const path = issue.path.length ? (issue.path.join('.') as FieldPath<SettingsFormValues>) : sectionFallbackErrorPath[activeSection];
        form.setError(path, { type: 'manual', message: issue.message });
      });
      toast.error(`Please fix the highlighted ${settingsSectionLabels[activeSection].toLowerCase()} fields before saving.`);
      return null;
    }

    return {
      ...rawValues,
      ...(result.data as Partial<SettingsFormValues>)
    } as SettingsFormValues;
  };

  const handleSaveActiveSection = async (): Promise<void> => {
    if (!canWriteSettings || !config) {
      return;
    }

    const values = validateActiveSection();
    if (!values) {
      return;
    }

    setSavingSection(activeSection);

    try {
      await adminService.updateSettings(buildSettingsSectionPayload(activeSection, values, config.revision));
      toast.success(`${settingsSectionLabels[activeSection]} updated`);
      await settings.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Unable to update ${settingsSectionLabels[activeSection].toLowerCase()} right now.`));
    } finally {
      setSavingSection(null);
    }
  };

  const settingsSections: Array<{ key: SettingsSectionKey; label: string; detail: string }> = [
    {
      key: 'operations',
      label: settingsSectionLabels.operations,
      detail: `${supportedCurrencies.length} currencies`
    },
    {
      key: 'presence',
      label: settingsSectionLabels.presence,
      detail: maintenanceEnabled ? 'Maintenance on' : 'Storefront live'
    },
    {
      key: 'payments',
      label: settingsSectionLabels.payments,
      detail: form.watch('bankName') || 'Bank details'
    },
    {
      key: 'shipping',
      label: settingsSectionLabels.shipping,
      detail: `${shippingFields.length} zones`
    },
    {
      key: 'communications',
      label: settingsSectionLabels.communications,
      detail: `${emailFields.length} templates`
    }
  ];

  return (
    <div className="space-y-3 pb-2">
      <AdminPageHeader
        eyebrow="Administration"
        title="Store Settings"
        description="Run the storefront from one workspace: operational rules, currencies, customer channels, notification rules, shipping, maintenance state, payment details, and outbound email templates."
        action={
          !canWriteSettings ? (
            <Badge variant="default" className="bg-white/[0.06] text-gray-300">
              Read Only
            </Badge>
          ) : undefined
        }
      />
      {config ? (
        <AdminStatGrid
          className="xl:grid-cols-8"
          items={[
            {
              label: 'Free shipping',
              value: `LKR ${config.freeShippingThreshold.toLocaleString()}`,
              support: 'Orders at or above this threshold qualify automatically.',
              tone: 'gold'
            },
            {
              label: 'Low stock alert',
              value: config.lowStockThreshold.toLocaleString(),
              support: 'Variants at or below this level appear in stock alerts.',
              tone: config.lowStockThreshold > 0 ? 'rose' : 'slate'
            },
            {
              label: 'Loyalty earn rate',
              value: `1 pt / LKR ${config.loyaltyPointsRate.toLocaleString()}`,
              support: 'Customers earn one point per spend threshold reached.',
              tone: 'blue'
            },
            {
              label: 'Quote validity',
              value: `${config.quotationExpiryDays} days`,
              support: 'Quotations expire automatically after this window.',
              tone: 'slate'
            },
            {
              label: 'Tax',
              value: config.taxSettings?.enabled ? `${config.taxSettings.label} ${config.taxSettings.rate}%` : 'Disabled',
              support: config.taxSettings?.enabled
                ? 'Applied on the discounted checkout total before the quotation is saved.'
                : 'No tax is added to checkout totals right now.',
              tone: config.taxSettings?.enabled ? 'gold' : 'slate'
            },
            {
              label: 'Currencies',
              value: config.supportedCurrencies?.find((currency) => currency.isDefault)?.code ?? 'LKR',
              support: `${config.supportedCurrencies?.length ?? 1} shopper-facing currencies are currently available.`,
              tone: 'blue'
            },
            {
              label: 'Notifications',
              value: `${Object.values(config.notificationSettings ?? defaultNotificationSettings).filter((entry) => entry.emailEnabled).length} email live`,
              support: 'Notification channels are controlled per event for both email and SMS.',
              tone: 'emerald'
            },
            {
              label: 'Storefront',
              value: config.maintenanceMode?.enabled ? 'Maintenance' : 'Live',
              support: config.maintenanceMode?.enabled
                ? 'Customers currently see the maintenance message instead of the catalog.'
                : 'Customers can browse and place quotations normally.',
              tone: config.maintenanceMode?.enabled ? 'rose' : 'emerald'
            }
          ]}
        />
      ) : null}
      {config ? (
        <AdminSurfacePanel>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveActiveSection();
            }}
          >
            <section className="rounded-[22px] border border-white/10 bg-[#081224]/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Setting Panels</p>
                  <p className="mt-2 text-sm text-gray-400">Active: {settingsSectionLabels[activeSection]}</p>
                </div>
                <Badge variant="default" className="bg-white/[0.06] text-gray-300">
                  Revision {config.revision}
                </Badge>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {settingsSections.map((section) => {
                  const isActive = activeSection === section.key;

                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => setActiveSection(section.key)}
                      className={`rounded-[16px] border px-3.5 py-3 text-left transition-[border-color,background-color,color,transform] duration-200 ${
                        isActive
                          ? 'border-gold/40 bg-gold/10 text-white shadow-[0_10px_20px_rgba(212,175,55,0.12)]'
                          : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">{section.label}</span>
                        <span
                          className={`relative flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                            isActive ? 'bg-gold/70' : 'bg-white/10'
                          }`}
                        >
                          <span
                            className={`h-5 w-5 rounded-full bg-white shadow-[0_4px_10px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
                              isActive ? 'translate-x-[1.25rem]' : 'translate-x-0.5'
                            }`}
                          />
                        </span>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-gray-500">{section.detail}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            <fieldset disabled={!canWriteSettings} className="block">
              {activeSection === 'operations' ? (
              <div className="space-y-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                <div className="border-b border-white/10 pb-3.5">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-gold">Store controls</p>
                  <h3 className="mt-2.5 font-display text-[1.55rem] leading-tight text-white">Operational Thresholds</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">Tune the store identity plus the checkout, quotation, tax, currency, loyalty, and inventory rules that shape customer orders.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Store Name" {...form.register('storeName')} error={form.formState.errors.storeName?.message} />
                  <Input
                    label="Free Shipping Threshold"
                    type="number"
                    {...form.register('freeShippingThreshold', { valueAsNumber: true })}
                    error={form.formState.errors.freeShippingThreshold?.message}
                  />
                  <Input
                    label="Low Stock Threshold"
                    type="number"
                    {...form.register('lowStockThreshold', { valueAsNumber: true })}
                    error={form.formState.errors.lowStockThreshold?.message}
                  />
                  <Input
                    label="Loyalty Points Rate"
                    type="number"
                    {...form.register('loyaltyPointsRate', { valueAsNumber: true })}
                    error={form.formState.errors.loyaltyPointsRate?.message}
                  />
                  <Input
                    label="Cancellation Window (hours)"
                    type="number"
                    {...form.register('cancellationWindowHours', { valueAsNumber: true })}
                    error={form.formState.errors.cancellationWindowHours?.message}
                  />
                  <Input
                    label="Quotation Validity (days)"
                    type="number"
                    {...form.register('quotationExpiryDays', { valueAsNumber: true })}
                    error={form.formState.errors.quotationExpiryDays?.message}
                  />
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <section className="rounded-[24px] border border-white/10 bg-[#07101f] p-4 sm:p-5">
                    <div className="border-b border-white/10 pb-3.5">
                      <h3 className="font-display text-[1.35rem] leading-tight text-white">Dark Logo</h3>
                      <p className="mt-2 text-sm leading-6 text-gray-400">Used on light storefront headers. Choose artwork with dark text or marks.</p>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-[150px_minmax(0,1fr)]">
                      <div className="overflow-hidden rounded-[20px] border border-slate-300/70 bg-slate-100">
                        {watchedStoreLogoDarkUrl ? (
                          <img src={watchedStoreLogoDarkUrl} alt={watchedStoreLogoDarkAlt || 'Dark mode logo preview'} className="h-36 w-full object-contain p-4" loading="lazy" decoding="async" />
                        ) : (
                          <div className="flex h-36 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-slate-500">
                            <ImagePlus className="h-5 w-5" />
                            Upload a dark logo.
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <Input label="Logo URL" placeholder="https://..." {...form.register('storeLogoDarkUrl')} error={form.formState.errors.storeLogoDarkUrl?.message} />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            label="Asset Public ID"
                            placeholder="njstore/site-config/store-logo-dark"
                            {...form.register('storeLogoDarkPublicId')}
                            error={form.formState.errors.storeLogoDarkPublicId?.message}
                          />
                          <Input
                            label="Alt Text"
                            placeholder="NJ Store dark logo"
                            {...form.register('storeLogoDarkAlt')}
                            error={form.formState.errors.storeLogoDarkAlt?.message}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <input
                            ref={storeLogoDarkInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(event) => void handleUploadStoreLogoDark(event)}
                          />
                          <Button type="button" variant="secondary" onClick={() => storeLogoDarkInputRef.current?.click()} isLoading={isUploadingStoreLogoDark}>
                            <Upload className="h-4 w-4" />
                            Upload Dark Logo
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              form.setValue('storeLogoDarkUrl', '', { shouldDirty: true, shouldValidate: true });
                              form.setValue('storeLogoDarkPublicId', '', { shouldDirty: true });
                              form.setValue('storeLogoDarkAlt', '', { shouldDirty: true });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </section>
                  <section className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4 sm:p-5">
                    <div className="border-b border-white/10 pb-3.5">
                      <h3 className="font-display text-[1.35rem] leading-tight text-white">Light Logo</h3>
                      <p className="mt-2 text-sm leading-6 text-gray-400">Used on dark storefront headers. Choose artwork with light text or marks.</p>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-[150px_minmax(0,1fr)]">
                      <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#07101f]">
                        {watchedStoreLogoLightUrl ? (
                          <img src={watchedStoreLogoLightUrl} alt={watchedStoreLogoLightAlt || 'Light mode logo preview'} className="h-36 w-full object-contain p-4" loading="lazy" decoding="async" />
                        ) : (
                          <div className="flex h-36 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-gray-500">
                            <ImagePlus className="h-5 w-5" />
                            Upload a light logo.
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <Input label="Logo URL" placeholder="https://..." {...form.register('storeLogoLightUrl')} error={form.formState.errors.storeLogoLightUrl?.message} />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            label="Asset Public ID"
                            placeholder="njstore/site-config/store-logo-light"
                            {...form.register('storeLogoLightPublicId')}
                            error={form.formState.errors.storeLogoLightPublicId?.message}
                          />
                          <Input
                            label="Alt Text"
                            placeholder="NJ Store light logo"
                            {...form.register('storeLogoLightAlt')}
                            error={form.formState.errors.storeLogoLightAlt?.message}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <input
                            ref={storeLogoLightInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(event) => void handleUploadStoreLogoLight(event)}
                          />
                          <Button type="button" variant="secondary" onClick={() => storeLogoLightInputRef.current?.click()} isLoading={isUploadingStoreLogoLight}>
                            <Upload className="h-4 w-4" />
                            Upload Light Logo
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              form.setValue('storeLogoLightUrl', '', { shouldDirty: true, shouldValidate: true });
                              form.setValue('storeLogoLightPublicId', '', { shouldDirty: true });
                              form.setValue('storeLogoLightAlt', '', { shouldDirty: true });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">Tax Settings</p>
                      <p className="mt-1 text-sm leading-6 text-gray-400">Apply an optional checkout tax such as VAT or GST on the discounted quotation total.</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <span className={`relative flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${taxEnabled ? 'bg-gold/70' : 'bg-white/10'}`}>
                        <span
                          className={`inline-block h-5 w-5 rounded-full bg-white shadow-[0_4px_12px_rgba(15,23,42,0.45)] transition-transform duration-200 ${
                            taxEnabled ? 'translate-x-[1.25rem]' : 'translate-x-0.5'
                          }`}
                        />
                      </span>
                      <input type="checkbox" className="sr-only" {...form.register('taxEnabled')} />
                      <span className="sr-only">Enable tax settings</span>
                    </label>
                  </div>
                  <div className={`mt-4 grid gap-4 md:grid-cols-2 ${taxEnabled ? '' : 'opacity-75'}`}>
                    <Input label="Tax Label" placeholder="VAT" {...form.register('taxLabel')} error={form.formState.errors.taxLabel?.message} />
                    <Input
                      label="Tax Rate (%)"
                      type="number"
                      placeholder="18"
                      {...form.register('taxRate', { valueAsNumber: true })}
                      error={form.formState.errors.taxRate?.message}
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">Supported Currencies</p>
                      <p className="mt-1 text-sm leading-6 text-gray-400">Storefront prices are stored in LKR and converted for shoppers using these rates.</p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => appendCurrency({ code: '', symbol: '', rate: 1, isDefault: false })}
                    >
                      <Plus className="h-4 w-4" />
                      Add Currency
                    </Button>
                  </div>
                  {form.formState.errors.supportedCurrencies?.message || form.formState.errors.supportedCurrencies?.root?.message ? (
                    <p className="mt-3 text-sm text-rose-300">
                      {form.formState.errors.supportedCurrencies?.message ?? form.formState.errors.supportedCurrencies?.root?.message}
                    </p>
                  ) : null}
                  <div className="mt-4 space-y-3.5">
                    {currencyFields.map((field, index) => {
                      const currencyCode = supportedCurrencies[index]?.code?.trim().toUpperCase() ?? '';
                      const isBaseCurrency = currencyCode === 'LKR';
                      const isDefaultCurrency = Boolean(supportedCurrencies[index]?.isDefault);

                      return (
                        <div key={field.id} className="rounded-2xl border border-white/10 bg-[#07101c] p-3.5">
                          <input
                            type="hidden"
                            {...form.register(`supportedCurrencies.${index}.isDefault`, {
                              setValueAs: (value) => value === true || value === 'true'
                            })}
                            value={isDefaultCurrency ? 'true' : 'false'}
                          />
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-white">{currencyCode || `Currency ${index + 1}`}</p>
                              <p className="mt-1 text-xs text-gray-500">
                                {isBaseCurrency
                                  ? 'Base currency for catalog pricing and order storage.'
                                  : 'Conversion rate is multiplied against stored LKR prices.'}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {isDefaultCurrency ? (
                                <Badge variant="default" className="bg-gold/10 text-gold">
                                  Default
                                </Badge>
                              ) : (
                                <Button type="button" size="sm" variant="ghost" onClick={() => setDefaultCurrency(index)}>
                                  Set Default
                                </Button>
                              )}
                              {!isBaseCurrency ? (
                                <Button type="button" size="sm" variant="ghost" onClick={() => removeCurrency(index)}>
                                  <Trash2 className="h-4 w-4" />
                                  Remove
                                </Button>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-3.5 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
                            <Input
                              label="Code"
                              placeholder="USD"
                              {...form.register(`supportedCurrencies.${index}.code`)}
                              error={form.formState.errors.supportedCurrencies?.[index]?.code?.message}
                            />
                            <Input
                              label="Symbol"
                              placeholder="$"
                              {...form.register(`supportedCurrencies.${index}.symbol`)}
                              error={form.formState.errors.supportedCurrencies?.[index]?.symbol?.message}
                            />
                            <Input
                              label="Rate vs LKR"
                              type="number"
                              placeholder="0.0033"
                              step="any"
                              readOnly={isBaseCurrency}
                              {...form.register(`supportedCurrencies.${index}.rate`, { valueAsNumber: true })}
                              error={form.formState.errors.supportedCurrencies?.[index]?.rate?.message}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              ) : null}
              {activeSection === 'presence' ? (
              <div className="space-y-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                <div className="border-b border-white/10 pb-3.5">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-gold">Customer channels</p>
                  <h3 className="mt-2.5 font-display text-[1.55rem] leading-tight text-white">Storefront Presence</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">Manage the live footer, contact details, and location data that the storefront footer and Contact page share automatically.</p>
                </div>
                <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                  <div className="border-b border-white/10 pb-3.5">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-gold">Footer settings</p>
                    <h4 className="mt-2.5 font-display text-[1.4rem] leading-tight text-white">Footer Content & Layout</h4>
                    <p className="mt-2 text-sm leading-6 text-gray-400">These fields feed the dynamic footer, Contact page details, map preview, and quick-link column from one source of truth.</p>
                  </div>

                  <div className="mt-4 rounded-[22px] border border-white/10 bg-[#07101c] p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-gold">Live summary</p>
                    <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04]">
                          {watchedFooterLogoUrl ? (
                            <img src={watchedFooterLogoUrl} alt={watchedFooterLogoAlt || 'Footer logo preview'} className="h-full w-full object-contain p-3" loading="lazy" decoding="async" />
                          ) : (
                            <ImagePlus className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-white">{form.watch('footerCompanyName') || 'Footer company name'}</p>
                          <p className="mt-1 max-w-xl text-sm leading-6 text-gray-400">{form.watch('footerDescription') || defaultFooterDescription}</p>
                        </div>
                      </div>
                      <div className="grid gap-2 text-sm text-gray-300 sm:grid-cols-2">
                        <span>{form.watch('footerEmail') || defaultFooterEmail}</span>
                        <span>{form.watch('footerPhone') || '+94 11 245 8899'}</span>
                        <span>{form.watch('footerWhatsappNumber') || '94112458899'}</span>
                        <span>{form.watch('footerOpeningHours') || 'Hours optional'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Input label="Company Name" {...form.register('footerCompanyName')} error={form.formState.errors.footerCompanyName?.message} />
                    <Input label="Support Email" {...form.register('footerEmail')} error={form.formState.errors.footerEmail?.message} />
                    <Input label="Phone Number" {...form.register('footerPhone')} error={form.formState.errors.footerPhone?.message} />
                    <Input label="WhatsApp Number" {...form.register('footerWhatsappNumber')} error={form.formState.errors.footerWhatsappNumber?.message} />
                    <div className="md:col-span-2">
                      <Textarea label="Description" className="min-h-24" {...form.register('footerDescription')} error={form.formState.errors.footerDescription?.message} />
                    </div>
                    <div className="md:col-span-2">
                      <Textarea label="Physical Address" className="min-h-24" {...form.register('footerPhysicalAddress')} error={form.formState.errors.footerPhysicalAddress?.message} />
                    </div>
                    <Input label="Opening Hours" placeholder="Mon-Sat, 9:00 AM to 6:00 PM" {...form.register('footerOpeningHours')} error={form.formState.errors.footerOpeningHours?.message} />
                    <Input label="Copyright Text" {...form.register('footerCopyrightText')} error={form.formState.errors.footerCopyrightText?.message} />
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">Footer Logo</p>
                        <p className="mt-1 text-sm leading-6 text-gray-400">Optional logo shown in the footer area. You can use a dedicated footer mark or reuse the main store brand.</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
                      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#111d33]/85">
                        {watchedFooterLogoUrl ? (
                          <img src={watchedFooterLogoUrl} alt={watchedFooterLogoAlt || 'Footer logo preview'} className="h-40 w-full object-contain p-4" loading="lazy" decoding="async" />
                        ) : (
                          <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-gray-500">
                            <ImagePlus className="h-5 w-5" />
                            Optional footer logo preview appears here.
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                          <Input label="Footer Logo URL" placeholder="https://..." {...form.register('footerLogoUrl')} error={form.formState.errors.footerLogoUrl?.message} />
                          <div className="flex items-end">
                            <input
                              ref={footerLogoInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={(event) => void handleUploadFooterLogo(event)}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-12 min-w-[148px] justify-center"
                              onClick={() => footerLogoInputRef.current?.click()}
                              isLoading={isUploadingFooterLogo}
                            >
                              <Upload className="h-4 w-4" />
                              Upload Logo
                            </Button>
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-12 min-w-[132px] justify-center"
                              onClick={() => {
                                form.setValue('footerLogoUrl', '', { shouldDirty: true, shouldValidate: true });
                                form.setValue('footerLogoPublicId', '', { shouldDirty: true });
                                form.setValue('footerLogoAlt', '', { shouldDirty: true });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove Logo
                            </Button>
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Input label="Footer Asset Public ID" placeholder="njstore/site-config/footer-logo" {...form.register('footerLogoPublicId')} error={form.formState.errors.footerLogoPublicId?.message} />
                          <Input label="Footer Logo Alt Text" placeholder="NJ Store footer logo" {...form.register('footerLogoAlt')} error={form.formState.errors.footerLogoAlt?.message} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">Location & Map</p>
                        <p className="mt-1 text-sm leading-6 text-gray-400">Use a Google Maps embed URL, or leave it blank and provide coordinates/address so the Contact page can build a working preview.</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <Input label="Google Maps Embed URL" placeholder="https://www.google.com/maps?q=Pelawatta&output=embed" {...form.register('footerMapEmbedUrl')} error={form.formState.errors.footerMapEmbedUrl?.message} />
                      </div>
                      <Input label="Latitude" type="number" step="any" placeholder="6.9271" {...form.register('footerLatitude', { valueAsNumber: false })} error={form.formState.errors.footerLatitude?.message} />
                      <Input label="Longitude" type="number" step="any" placeholder="79.8612" {...form.register('footerLongitude', { valueAsNumber: false })} error={form.formState.errors.footerLongitude?.message} />
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">Social Links</p>
                        <p className="mt-1 text-sm leading-6 text-gray-400">These links appear as clickable icons in the footer and alongside the contact card.</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <Input label="Facebook URL" placeholder="https://www.facebook.com/njstore" {...form.register('footerFacebookUrl')} error={form.formState.errors.footerFacebookUrl?.message} />
                      <Input label="Instagram URL" placeholder="https://www.instagram.com/njstore" {...form.register('footerInstagramUrl')} error={form.formState.errors.footerInstagramUrl?.message} />
                      <Input label="TikTok URL" placeholder="https://www.tiktok.com/@njstore" {...form.register('footerTikTokUrl')} error={form.formState.errors.footerTikTokUrl?.message} />
                      <Input label="YouTube URL" placeholder="https://www.youtube.com/@njstore" {...form.register('footerYouTubeUrl')} error={form.formState.errors.footerYouTubeUrl?.message} />
                      <div className="md:col-span-2">
                        <Input label="X URL" placeholder="https://x.com/njstore" {...form.register('footerXUrl')} error={form.formState.errors.footerXUrl?.message} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">Footer Columns</p>
                        <p className="mt-1 text-sm leading-6 text-gray-400">Rename the four footer group labels and control the quick links shown in the second column.</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <Input label="Column 1 Title" {...form.register('footerSectionAboutTitle')} error={form.formState.errors.footerSectionAboutTitle?.message} />
                      <Input label="Column 2 Title" {...form.register('footerSectionQuickLinksTitle')} error={form.formState.errors.footerSectionQuickLinksTitle?.message} />
                      <Input label="Column 3 Title" {...form.register('footerSectionContactTitle')} error={form.formState.errors.footerSectionContactTitle?.message} />
                      <Input label="Column 4 Title" {...form.register('footerSectionSocialTitle')} error={form.formState.errors.footerSectionSocialTitle?.message} />
                    </div>
                    <div className="mt-4 space-y-3">
                      {footerQuickLinkFields.map((field, index) => (
                        <div key={field.id} className="rounded-2xl border border-white/10 bg-[#07101c] p-3.5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-white">Quick Link {index + 1}</p>
                            <Button type="button" size="sm" variant="ghost" onClick={() => removeFooterQuickLink(index)}>
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </Button>
                          </div>
                          <div className="mt-3.5 grid gap-4 md:grid-cols-2">
                            <Input label="Label" {...form.register(`footerQuickLinks.${index}.label`)} error={form.formState.errors.footerQuickLinks?.[index]?.label?.message} />
                            <Input label="Path or URL" {...form.register(`footerQuickLinks.${index}.href`)} error={form.formState.errors.footerQuickLinks?.[index]?.href?.message} />
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="secondary" onClick={() => appendFooterQuickLink({ label: '', href: '' })}>
                        <Plus className="h-4 w-4" />
                        Add Quick Link
                      </Button>
                    </div>
                  </div>
                </section>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">Maintenance Mode</p>
                      <p className="mt-1 text-sm leading-6 text-gray-400">When enabled, customers see a branded maintenance page instead of the live storefront.</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <span className={`relative flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${maintenanceEnabled ? 'bg-gold/70' : 'bg-white/10'}`}>
                        <span
                          className={`inline-block h-5 w-5 rounded-full bg-white shadow-[0_4px_12px_rgba(15,23,42,0.45)] transition-transform duration-200 ${
                            maintenanceEnabled ? 'translate-x-[1.25rem]' : 'translate-x-0.5'
                          }`}
                        />
                      </span>
                      <input type="checkbox" className="sr-only" {...form.register('maintenanceEnabled')} />
                      <span className="sr-only">Enable maintenance mode</span>
                    </label>
                  </div>
                  <div className={`mt-4 ${maintenanceEnabled ? '' : 'opacity-75'}`}>
                    <Textarea
                      label="Maintenance Message"
                      className="min-h-24"
                      placeholder={defaultMaintenanceMessage}
                      {...form.register('maintenanceMessage')}
                      error={form.formState.errors.maintenanceMessage?.message}
                    />
                  </div>
                </div>
              </div>
              ) : null}
              {activeSection === 'payments' ? (
              <div className="space-y-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                <div className="border-b border-white/10 pb-3.5">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-gold">Payments</p>
                  <h3 className="mt-2.5 font-display text-[1.55rem] leading-tight text-white">Bank Transfer Details</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">These details are shown during quotation checkout and payment receipt flows.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Account Name" {...form.register('accountName')} error={form.formState.errors.accountName?.message} />
                  <Input label="Bank Name" {...form.register('bankName')} error={form.formState.errors.bankName?.message} />
                  <Input label="Branch" {...form.register('branch')} error={form.formState.errors.branch?.message} />
                  <Input label="Account Number" {...form.register('accountNumber')} error={form.formState.errors.accountNumber?.message} />
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300 md:col-span-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-white/15 bg-white/5" {...form.register('cashOnDeliveryEnabled')} />
                    <span>
                      <span className="block font-medium text-white">Enable Cash on Delivery</span>
                      <span className="mt-1 block text-xs leading-5 text-gray-400">When disabled, customers cannot choose COD while confirming delivery quotations.</span>
                    </span>
                  </label>
                </div>
              </div>
              ) : null}
              {activeSection === 'shipping' ? (
              <div className="space-y-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                <div className="border-b border-white/10 pb-3.5">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-gold">Logistics</p>
                  <h3 className="mt-2.5 font-display text-[1.55rem] leading-tight text-white">Shipping Zones</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">Manage delivery districts, their required courier fees, and expected SLA delivery days.</p>
                </div>
                <div className="space-y-4">
                  {shippingFields.map((field, index) => (
                    <div key={field.id} className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">Zone {index + 1}</p>
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeShipping(index)}>
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                      <div className="mt-3.5 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
                        <Input label="District/City" placeholder="Colombo" {...form.register(`shippingRates.${index}.city`)} error={form.formState.errors.shippingRates?.[index]?.city?.message} />
                        <Input label="Fee (LKR)" type="number" placeholder="400" {...form.register(`shippingRates.${index}.fee`, { valueAsNumber: true })} error={form.formState.errors.shippingRates?.[index]?.fee?.message} />
                        <Input label="Delivery Days" placeholder="1 - 3 Days" {...form.register(`shippingRates.${index}.days`)} error={form.formState.errors.shippingRates?.[index]?.days?.message} />
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="secondary" onClick={() => appendShipping({ city: '', fee: 0, days: '' })}>
                    <Plus className="h-4 w-4" />
                    Add Shipping Zone
                  </Button>
                </div>
              </div>
              ) : null}
              {activeSection === 'communications' ? (
              <div className="space-y-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                <div className="border-b border-white/10 pb-3.5">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-gold">Communications</p>
                  <h3 className="mt-2.5 font-display text-[1.55rem] leading-tight text-white">Email Templates</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">Raw HTML templates used for outgoing system emails such as order confirmations.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <p className="text-sm font-medium text-white">Notification Rules</p>
                    <p className="mt-1 text-sm leading-6 text-gray-400">Email uses the live outbound mailer. SMS uses the customer or support phone when a gateway is configured.</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {notificationRuleDefinitions.map((rule) => (
                      <div key={rule.key} className="rounded-2xl border border-white/10 bg-[#07101c] p-3.5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="max-w-2xl">
                            <p className="text-sm font-medium text-white">{rule.label}</p>
                            <p className="mt-1 text-sm leading-6 text-gray-400">{rule.description}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-4">
                            <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                              <input type="checkbox" className="h-4 w-4 rounded border-white/15 bg-white/5" {...form.register(`notificationSettings.${rule.key}.emailEnabled`)} />
                              Email
                            </label>
                            <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                              <input type="checkbox" className="h-4 w-4 rounded border-white/15 bg-white/5" {...form.register(`notificationSettings.${rule.key}.smsEnabled`)} />
                              SMS
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  {emailFields.map((field, index) => (
                    <div key={field.id} className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">{form.watch(`emailTemplates.${index}.type`) || `Template ${index + 1}`}</p>
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeEmail(index)}>
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                      <div className="mt-3.5 grid gap-4 lg:grid-cols-2">
                        <Input label="Trigger Type" placeholder="order_confirmation" {...form.register(`emailTemplates.${index}.type`)} error={form.formState.errors.emailTemplates?.[index]?.type?.message} />
                        <Input label="Subject Line" placeholder="Your NJ Store Order" {...form.register(`emailTemplates.${index}.subject`)} error={form.formState.errors.emailTemplates?.[index]?.subject?.message} />
                        <div className="lg:col-span-2">
                          <Textarea label="Raw HTML Body" className="font-mono text-sm h-32" placeholder="<h1>Thank you...</h1>" {...form.register(`emailTemplates.${index}.bodyHtml`)} error={form.formState.errors.emailTemplates?.[index]?.bodyHtml?.message} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="secondary" onClick={() => appendEmail({ type: '', subject: '', bodyHtml: '' })}>
                    <Plus className="h-4 w-4" />
                    Add Email Template
                  </Button>
                </div>
              </div>
              ) : null}
            </fieldset>
            <div>
              {canWriteSettings ? (
                <Button type="submit" isLoading={savingSection === activeSection}>
                  Save {settingsSectionLabels[activeSection]}
                </Button>
              ) : (
                <p className="text-sm text-gray-400">This account can view settings but cannot change them.</p>
              )}
            </div>
          </form>
        </AdminSurfacePanel>
      ) : null}
    </div>
  );
};
