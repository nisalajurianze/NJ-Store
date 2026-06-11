import { zodResolver } from '@hookform/resolvers/zod';
import type {
  BannerDto,
  BannerMutationDto,
  BannerShowcaseFeatureItemDto,
  HomeAdSlotKey,
  ProductSuggestionDto
} from '@njstore/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Badge } from '@njstore/ui';
import toast from 'react-hot-toast';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { adminService } from '../../services/adminService';
import { AdminPageHeader, AdminStatGrid } from '../../components/ui/AdminSurface';
import { getApiErrorMessage } from '../../utils/apiError';
import { HomeBannerEditorPanel } from './homeBanner/HomeBannerEditorPanel';
import { HomeBannerPreviewModal } from './homeBanner/HomeBannerPreviewModal';
import {
  adSlotFieldNames,
  buildDefaults,
  buildMutationPayload,
  buildSectionBaseValues,
  featurePromoFieldNames,
  hasMediaItemContent,
  heroFieldNames,
  heroSpotlightFieldNames,
  homeBannerSchema,
  mapProductSelection,
  mapShowcaseFeatureGroups,
  mapShowcaseProducts,
  normalizeHeroCornerImageSize,
  type EditorSectionKey,
  type HomeBannerFormValues
} from './homeBanner/homeBannerFormModel';
import type { HomeBannerImageUploadTarget } from './homeBanner/homeBannerUploadTypes';
import { useHomeBannerFieldArrays } from './homeBanner/useHomeBannerFieldArrays';

const ADMIN_BANNER_STALE_TIME_MS = 60_000;

export const HomeBanner = (): JSX.Element => {
  const { hasPermissions } = useAdminPermissions();
  const queryClient = useQueryClient();
  const banner = useQuery({
    queryKey: ['admin', 'home-hero-banner'],
    queryFn: () => adminService.homeHeroBanner(),
    staleTime: ADMIN_BANNER_STALE_TIME_MS
  });
  const canWriteBanner = hasPermissions('setting:write');
  const form = useForm<HomeBannerFormValues>({
    resolver: zodResolver(homeBannerSchema),
    defaultValues: buildDefaults()
  });
  const { adSlotFields, adSlotMediaArrays, featurePromoMediaArray } = useHomeBannerFieldArrays(form.control);
  const [heroSpotlightSearch, setHeroSpotlightSearch] = useState('');
  const [selectedHeroSpotlightProduct, setSelectedHeroSpotlightProduct] = useState<ProductSuggestionDto | null>(null);
  const [showcaseSearch, setShowcaseSearch] = useState('');
  const [selectedShowcaseProducts, setSelectedShowcaseProducts] = useState<ProductSuggestionDto[]>([]);
  const [showcaseFeatureGroups, setShowcaseFeatureGroups] = useState<Record<string, BannerShowcaseFeatureItemDto[]>>({});
  const [savedBanner, setSavedBanner] = useState<BannerDto | null>(null);
  const [activeSection, setActiveSection] = useState<EditorSectionKey>('hero');
  const [previewSection, setPreviewSection] = useState<EditorSectionKey | null>(null);
  const [savingSection, setSavingSection] = useState<EditorSectionKey | null>(null);
  const [uploadingImageTarget, setUploadingImageTarget] = useState<string | null>(null);

  const heroSpotlightSuggestionsQuery = useQuery({
    queryKey: ['admin', 'banner-hero-spotlight-suggestions', heroSpotlightSearch],
    queryFn: () => adminService.productSuggestions(heroSpotlightSearch),
    enabled: heroSpotlightSearch.trim().length >= 2,
    staleTime: 30_000
  });

  const productSuggestions = useQuery({
    queryKey: ['admin', 'banner-showcase-suggestions', showcaseSearch],
    queryFn: () => adminService.productSuggestions(showcaseSearch),
    enabled: showcaseSearch.trim().length >= 2,
    staleTime: 30_000
  });

  useEffect(() => {
    if (!banner.data?.data || savedBanner) {
      return;
    }

    form.reset(buildDefaults(banner.data.data));
    setSelectedHeroSpotlightProduct(mapProductSelection(banner.data.data.heroSpotlightProduct));
    setSelectedShowcaseProducts(mapShowcaseProducts(banner.data.data));
    setShowcaseFeatureGroups(mapShowcaseFeatureGroups(banner.data.data));
    setSavedBanner(banner.data.data);
  }, [banner.data?.data, form, savedBanner]);

  const persistedBanner = savedBanner ?? banner.data?.data ?? null;
  const isBootstrapping = banner.isPending && !persistedBanner;

  const preview = useWatch({ control: form.control }) as HomeBannerFormValues;
  const previewHeroCornerImageUrl = preview.heroCornerImageUrl.trim();
  const previewHeroCornerImageEnabled = preview.heroCornerImageEnabled;
  const previewHeroCornerImageSize = normalizeHeroCornerImageSize(preview.heroCornerImageSize);
  const previewHeroBottomLeftImageUrl = preview.heroBottomLeftImageUrl.trim();
  const previewHeroBottomLeftImageEnabled = preview.heroBottomLeftImageEnabled;
  const previewHeroBottomLeftImageSize = normalizeHeroCornerImageSize(preview.heroBottomLeftImageSize);
  const previewHeroBottomRightImageUrl = preview.heroBottomRightImageUrl.trim();
  const previewHeroBottomRightImageEnabled = preview.heroBottomRightImageEnabled;
  const previewHeroBottomRightImageSize = normalizeHeroCornerImageSize(preview.heroBottomRightImageSize);
  const previewFeaturePromoMediaItems = preview.featurePromo.mediaItems.filter((item) => hasMediaItemContent(item));
  const previewFeaturePromoPrimaryMedia = previewFeaturePromoMediaItems[0];

  const activeAdSlots = useMemo(
    () =>
      preview.adSlots.filter(
        (slot) => slot.isActive && (slot.title?.trim() || slot.description?.trim() || slot.mediaItems.some((item) => hasMediaItemContent(item)))
      ),
    [preview.adSlots]
  );
  const heroSpotlightSuggestions = heroSpotlightSuggestionsQuery.data?.data ?? [];
  const showcaseSuggestions = productSuggestions.data?.data ?? [];

  const chooseHeroSpotlightProduct = (product: ProductSuggestionDto): void => {
    setSelectedHeroSpotlightProduct(product);
    setHeroSpotlightSearch('');
  };

  const clearHeroSpotlightProduct = (): void => {
    setSelectedHeroSpotlightProduct(null);
  };

  const addShowcaseProduct = (product: ProductSuggestionDto): void => {
    setSelectedShowcaseProducts((current) => {
      if (current.some((entry) => entry.id === product.id) || current.length >= 8) {
        return current;
      }

      return [...current, product];
    });
    setShowcaseFeatureGroups((current) => ({ ...current, [product.id]: current[product.id] ?? [] }));
    setShowcaseSearch('');
  };

  const removeShowcaseProduct = (productId: string): void => {
    setSelectedShowcaseProducts((current) => current.filter((entry) => entry.id !== productId));
    setShowcaseFeatureGroups((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  };

  const moveShowcaseProduct = (productId: string, direction: 'left' | 'right'): void => {
    setSelectedShowcaseProducts((current) => {
      const index = current.findIndex((entry) => entry.id === productId);
      if (index < 0) {
        return current;
      }

      const nextIndex = direction === 'left' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const addShowcaseFeatureItem = (productId: string): void => {
    setShowcaseFeatureGroups((current) => {
      const nextItems: BannerShowcaseFeatureItemDto[] = [...(current[productId] ?? []), { icon: 'camera', label: '', value: '' }];

      return {
        ...current,
        [productId]: nextItems.slice(0, 4)
      };
    });
  };

  const updateShowcaseFeatureItem = (
    productId: string,
    index: number,
    field: keyof BannerShowcaseFeatureItemDto,
    value: string
  ): void => {
    setShowcaseFeatureGroups((current) => ({
      ...current,
      [productId]: (current[productId] ?? []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeShowcaseFeatureItem = (productId: string, index: number): void => {
    setShowcaseFeatureGroups((current) => ({
      ...current,
      [productId]: (current[productId] ?? []).filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const saveSectionPayload = async (section: EditorSectionKey, payload: BannerMutationDto, successMessage: string): Promise<void> => {
    if (!canWriteBanner) {
      return;
    }

    setSavingSection(section);

    try {
      const result = await adminService.updateHomeHeroBanner(payload);
      setSavedBanner(result.data);
      queryClient.setQueryData(['admin', 'home-hero-banner'], result);
      toast.success(successMessage);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update this home campaign section right now.'));
    } finally {
      setSavingSection(null);
    }
  };

  const uploadBannerImage = async (
    event: ChangeEvent<HTMLInputElement>,
    target: HomeBannerImageUploadTarget
  ): Promise<void> => {
    if (!canWriteBanner) {
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const currentAlt = form.getValues(target.altField);
    const alt = typeof currentAlt === 'string' && currentAlt.trim() ? currentAlt : undefined;

    try {
      setUploadingImageTarget(target.uploadKey);
      const uploaded = await adminService.uploadHomeBannerImage(file, alt);
      form.setValue(target.urlField, uploaded.data.url, { shouldDirty: true, shouldValidate: true });
      form.setValue(target.publicIdField, uploaded.data.publicId, { shouldDirty: true, shouldValidate: true });
      form.setValue(target.altField, uploaded.data.alt ?? file.name, { shouldDirty: true, shouldValidate: true });

      if (target.kindField) {
        form.setValue(target.kindField, 'image', { shouldDirty: true, shouldValidate: true });
      }

      toast.success(`${target.label} uploaded`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Unable to upload ${target.label.toLowerCase()} right now.`));
    } finally {
      setUploadingImageTarget(null);
    }
  };

  const saveHeroSection = async (): Promise<void> => {
    const isValid = await form.trigger(heroFieldNames);
    if (!isValid) {
      return;
    }

    const currentValues = form.getValues();
    const baseValues = buildSectionBaseValues(persistedBanner);
    const nextValues: HomeBannerFormValues = {
      ...baseValues,
      campaignLabel: currentValues.campaignLabel,
      title: currentValues.title,
      subtitle: currentValues.subtitle,
      ctaText: currentValues.ctaText,
      ctaUrl: currentValues.ctaUrl,
      accentText: currentValues.accentText,
      imageUrl: currentValues.imageUrl,
      imagePublicId: currentValues.imagePublicId,
      imageAlt: currentValues.imageAlt,
      isActive: currentValues.isActive
    };

    await saveSectionPayload(
      'hero',
      buildMutationPayload(
        nextValues,
        mapProductSelection(persistedBanner?.heroSpotlightProduct),
        mapShowcaseProducts(persistedBanner ?? undefined),
        mapShowcaseFeatureGroups(persistedBanner ?? undefined)
      ),
      'Hero updated'
    );
  };

  const saveAdSlotSection = async (slotKey: HomeAdSlotKey, index: number): Promise<void> => {
    const isValid = await form.trigger(adSlotFieldNames(index));
    if (!isValid) {
      return;
    }

    const currentValues = form.getValues();
    const baseValues = buildSectionBaseValues(persistedBanner);
    const currentSlot = currentValues.adSlots[index];
    const nextValues: HomeBannerFormValues = {
      ...baseValues,
      adSlots: baseValues.adSlots.map((slot) => (slot.slotKey === slotKey ? currentSlot : slot))
    };

    await saveSectionPayload(
      slotKey,
      buildMutationPayload(
        nextValues,
        mapProductSelection(persistedBanner?.heroSpotlightProduct),
        mapShowcaseProducts(persistedBanner ?? undefined),
        mapShowcaseFeatureGroups(persistedBanner ?? undefined)
      ),
      `Advertisement place ${index + 1} updated`
    );
  };

  const saveFeaturePromoSection = async (): Promise<void> => {
    const isValid = await form.trigger(featurePromoFieldNames);
    if (!isValid) {
      return;
    }

    const currentValues = form.getValues();
    const baseValues = buildSectionBaseValues(persistedBanner);
    const nextValues: HomeBannerFormValues = {
      ...baseValues,
      featurePromo: currentValues.featurePromo
    };

    await saveSectionPayload(
      'feature-promo',
      buildMutationPayload(
        nextValues,
        mapProductSelection(persistedBanner?.heroSpotlightProduct),
        mapShowcaseProducts(persistedBanner ?? undefined),
        mapShowcaseFeatureGroups(persistedBanner ?? undefined)
      ),
      'Mid-page promo updated'
    );
  };

  const saveHeroSpotlightSection = async (): Promise<void> => {
    const isValid = await form.trigger(heroSpotlightFieldNames);
    if (!isValid) {
      return;
    }

    const currentValues = form.getValues();
    const baseValues = buildSectionBaseValues(persistedBanner);
    const nextValues: HomeBannerFormValues = {
      ...baseValues,
      heroCornerImageUrl: currentValues.heroCornerImageUrl,
      heroCornerImagePublicId: currentValues.heroCornerImagePublicId,
      heroCornerImageAlt: currentValues.heroCornerImageAlt,
      heroCornerImageEnabled: currentValues.heroCornerImageEnabled,
      heroCornerImageSize: currentValues.heroCornerImageSize,
      heroBottomLeftImageUrl: currentValues.heroBottomLeftImageUrl,
      heroBottomLeftImagePublicId: currentValues.heroBottomLeftImagePublicId,
      heroBottomLeftImageAlt: currentValues.heroBottomLeftImageAlt,
      heroBottomLeftImageEnabled: currentValues.heroBottomLeftImageEnabled,
      heroBottomLeftImageSize: currentValues.heroBottomLeftImageSize,
      heroBottomRightImageUrl: currentValues.heroBottomRightImageUrl,
      heroBottomRightImagePublicId: currentValues.heroBottomRightImagePublicId,
      heroBottomRightImageAlt: currentValues.heroBottomRightImageAlt,
      heroBottomRightImageEnabled: currentValues.heroBottomRightImageEnabled,
      heroBottomRightImageSize: currentValues.heroBottomRightImageSize
    };
    await saveSectionPayload(
      'hero-spotlight',
      buildMutationPayload(
        nextValues,
        selectedHeroSpotlightProduct,
        mapShowcaseProducts(persistedBanner ?? undefined),
        mapShowcaseFeatureGroups(persistedBanner ?? undefined)
      ),
      'Hero spotlight updated'
    );
  };

  const saveShowcaseSection = async (): Promise<void> => {
    const baseValues = buildSectionBaseValues(persistedBanner);
    await saveSectionPayload(
      'showcase',
      buildMutationPayload(
        baseValues,
        mapProductSelection(persistedBanner?.heroSpotlightProduct),
        selectedShowcaseProducts,
        showcaseFeatureGroups
      ),
      'Curated showcase updated'
    );
  };

  const resetToSaved = (): void => {
    if (!persistedBanner) {
      return;
    }

    form.reset(buildDefaults(persistedBanner));
    setSelectedHeroSpotlightProduct(mapProductSelection(persistedBanner.heroSpotlightProduct));
    setSelectedShowcaseProducts(mapShowcaseProducts(persistedBanner));
    setShowcaseFeatureGroups(mapShowcaseFeatureGroups(persistedBanner));
    setHeroSpotlightSearch('');
    setShowcaseSearch('');
  };

  return (
    <div className="space-y-3 pb-2">
      <AdminPageHeader
        eyebrow="Administration"
        title="Home Banner"
        description="Control the storefront hero, ads, promo media, spotlight product, and rotating showcase from one campaign workspace."
        action={
          !canWriteBanner ? (
            <Badge variant="default" className="bg-white/[0.06] text-gray-300">
              Read Only
            </Badge>
          ) : undefined
        }
      />

      <AdminStatGrid
        className="xl:grid-cols-6"
        items={[
          {
            label: 'Status',
            value: preview.isActive ? 'Active' : 'Draft',
            support: preview.isActive ? 'Eligible to appear on the storefront.' : 'Fallback content stays live until published.',
            tone: preview.isActive ? 'emerald' : 'slate'
          },
          {
            label: 'Ad slots',
            value: `${activeAdSlots.length}/3 active`,
            support: 'Three editable ad placements.',
            tone: activeAdSlots.length ? 'blue' : 'slate'
          },
          {
            label: 'Mid-page promo',
            value: preview.featurePromo.isActive ? 'Live' : 'Hidden',
            support: preview.featurePromo.title?.trim() || 'Promo block between arrivals and brands.',
            tone: preview.featurePromo.isActive ? 'emerald' : 'slate'
          },
          {
            label: 'Hero spotlight',
            value: selectedHeroSpotlightProduct?.name ?? 'Not selected',
            support: 'Featured product for the hero stage.',
            tone: selectedHeroSpotlightProduct ? 'gold' : 'slate'
          },
          {
            label: 'Showcase products',
            value: `${selectedShowcaseProducts.length}`,
            support: 'Rotating right-side product cards.',
            tone: selectedShowcaseProducts.length ? 'gold' : 'slate'
          },
          {
            label: 'Last updated',
            value: persistedBanner?.updatedAt ? new Date(persistedBanner.updatedAt).toLocaleString() : 'Not published yet',
            support: 'Current saved campaign record.',
            tone: 'slate'
          }
        ]}
      />

      <AdminStatGrid
        className="xl:grid-cols-6"
        items={[
          {
            label: 'Campaign label',
            value: preview.campaignLabel || 'NJ Store',
            support: 'Eyebrow copy above the hero headline.',
            tone: 'gold'
          },
          {
            label: 'Headline length',
            value: `${preview.title.trim().length}`,
            support: 'Keep the hero title compact.',
            tone: preview.title.trim().length > 100 ? 'rose' : 'blue'
          },
          {
            label: 'Hero art',
            value: preview.imageUrl ? 'Configured' : 'Fallback',
            support: preview.imageUrl ? 'Uploaded background artwork.' : 'Using themed fallback surface.',
            tone: preview.imageUrl ? 'emerald' : 'slate'
          },
          {
            label: 'Mid-page media',
            value: previewFeaturePromoMediaItems.length ? `${previewFeaturePromoMediaItems.length} item(s)` : 'Text only',
            support: previewFeaturePromoMediaItems.length ? 'Images/videos ready for promo.' : 'Copy-only promo block.',
            tone: previewFeaturePromoMediaItems.length ? 'blue' : 'slate'
          },
          {
            label: 'Curated showcase',
            value: selectedShowcaseProducts[0]?.name ?? 'No products selected',
            support: 'Default card shown first.',
            tone: selectedShowcaseProducts.length ? 'emerald' : 'slate'
          },
          {
            label: 'Hero spotlight',
            value: selectedHeroSpotlightProduct?.name ?? 'No product selected',
            support: 'Selected featured product.',
            tone: selectedHeroSpotlightProduct ? 'gold' : 'slate'
          }
        ]}
      />

      <HomeBannerEditorPanel
        form={form}
        activeSection={activeSection}
        onActiveSectionChange={setActiveSection}
        canWriteBanner={canWriteBanner}
        isBootstrapping={isBootstrapping}
        savingSection={savingSection}
        preview={preview}
        persistedBanner={persistedBanner}
        adSlotFields={adSlotFields}
        adSlotMediaArrays={adSlotMediaArrays}
        featurePromoMediaArray={featurePromoMediaArray}
        heroSpotlightSearch={heroSpotlightSearch}
        onHeroSpotlightSearchChange={setHeroSpotlightSearch}
        heroSpotlightSuggestionsPending={heroSpotlightSuggestionsQuery.isPending}
        heroSpotlightSuggestions={heroSpotlightSuggestions}
        selectedHeroSpotlightProduct={selectedHeroSpotlightProduct}
        onChooseHeroSpotlightProduct={chooseHeroSpotlightProduct}
        onClearHeroSpotlightProduct={clearHeroSpotlightProduct}
        previewHeroCornerImageUrl={previewHeroCornerImageUrl}
        previewHeroCornerImageEnabled={previewHeroCornerImageEnabled}
        previewHeroCornerImageSize={previewHeroCornerImageSize}
        previewHeroBottomLeftImageUrl={previewHeroBottomLeftImageUrl}
        previewHeroBottomLeftImageEnabled={previewHeroBottomLeftImageEnabled}
        previewHeroBottomLeftImageSize={previewHeroBottomLeftImageSize}
        previewHeroBottomRightImageUrl={previewHeroBottomRightImageUrl}
        previewHeroBottomRightImageEnabled={previewHeroBottomRightImageEnabled}
        previewHeroBottomRightImageSize={previewHeroBottomRightImageSize}
        previewFeaturePromoPrimaryMedia={previewFeaturePromoPrimaryMedia}
        uploadingImageTarget={uploadingImageTarget}
        onUploadImage={uploadBannerImage}
        showcaseSearch={showcaseSearch}
        onShowcaseSearchChange={setShowcaseSearch}
        showcaseSuggestionsPending={productSuggestions.isPending}
        showcaseSuggestions={showcaseSuggestions}
        selectedShowcaseProducts={selectedShowcaseProducts}
        onAddShowcaseProduct={addShowcaseProduct}
        onRemoveShowcaseProduct={removeShowcaseProduct}
        onMoveShowcaseProduct={moveShowcaseProduct}
        showcaseFeatureGroups={showcaseFeatureGroups}
        onAddShowcaseFeatureItem={addShowcaseFeatureItem}
        onUpdateShowcaseFeatureItem={updateShowcaseFeatureItem}
        onRemoveShowcaseFeatureItem={removeShowcaseFeatureItem}
        onSaveHero={saveHeroSection}
        onSaveHeroSpotlight={saveHeroSpotlightSection}
        onSaveAdSlot={saveAdSlotSection}
        onSaveFeaturePromo={saveFeaturePromoSection}
        onSaveShowcase={saveShowcaseSection}
        onResetToSaved={resetToSaved}
        onPreviewSection={setPreviewSection}
      />

      <HomeBannerPreviewModal
        section={previewSection}
        onClose={() => setPreviewSection(null)}
        preview={preview}
        selectedHeroSpotlightProduct={selectedHeroSpotlightProduct}
        selectedShowcaseProducts={selectedShowcaseProducts}
        showcaseFeatureGroups={showcaseFeatureGroups}
        previewHeroCornerImageUrl={previewHeroCornerImageUrl}
        previewHeroCornerImageEnabled={previewHeroCornerImageEnabled}
        previewHeroCornerImageSize={previewHeroCornerImageSize}
        previewHeroBottomLeftImageUrl={previewHeroBottomLeftImageUrl}
        previewHeroBottomLeftImageEnabled={previewHeroBottomLeftImageEnabled}
        previewHeroBottomLeftImageSize={previewHeroBottomLeftImageSize}
        previewHeroBottomRightImageUrl={previewHeroBottomRightImageUrl}
        previewHeroBottomRightImageEnabled={previewHeroBottomRightImageEnabled}
        previewHeroBottomRightImageSize={previewHeroBottomRightImageSize}
      />
    </div>
  );
};
