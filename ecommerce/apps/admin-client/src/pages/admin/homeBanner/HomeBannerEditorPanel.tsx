import { Badge, Button } from '@njstore/ui';
import type {
  BannerDto,
  BannerShowcaseFeatureItemDto,
  HomeAdSlotKey,
  ProductSuggestionDto
} from '@njstore/types';
import { Eye } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { AdminSurfacePanel } from '../../../components/ui/AdminSurface';
import { AdSlotEditor } from './AdSlotEditor';
import { FeaturePromoEditor } from './FeaturePromoEditor';
import { HeroBannerForm } from './HeroBannerForm';
import { HeroSpotlightEditor } from './HeroSpotlightEditor';
import { ShowcaseProductSelector } from './ShowcaseProductSelector';
import {
  slotKeys,
  type EditorSectionKey,
  type HomeBannerFormValues
} from './homeBannerFormModel';
import type { HomeBannerImageUploadHandler } from './homeBannerUploadTypes';

interface MediaFieldArray {
  fields: Array<{ id: string }>;
  append: (value: HomeBannerFormValues['adSlots'][number]['mediaItems'][number]) => void;
  move: (from: number, to: number) => void;
  remove: (index: number) => void;
}

interface AdSlotField {
  id: string;
  slotKey: HomeAdSlotKey;
}

interface HomeBannerEditorPanelProps {
  form: UseFormReturn<HomeBannerFormValues>;
  activeSection: EditorSectionKey;
  onActiveSectionChange: (section: EditorSectionKey) => void;
  canWriteBanner: boolean;
  isBootstrapping: boolean;
  savingSection: EditorSectionKey | null;
  preview: HomeBannerFormValues;
  persistedBanner: BannerDto | null;
  adSlotFields: AdSlotField[];
  adSlotMediaArrays: readonly MediaFieldArray[];
  featurePromoMediaArray: MediaFieldArray;
  heroSpotlightSearch: string;
  onHeroSpotlightSearchChange: (value: string) => void;
  heroSpotlightSuggestionsPending: boolean;
  heroSpotlightSuggestions: ProductSuggestionDto[];
  selectedHeroSpotlightProduct: ProductSuggestionDto | null;
  onChooseHeroSpotlightProduct: (product: ProductSuggestionDto) => void;
  onClearHeroSpotlightProduct: () => void;
  previewHeroCornerImageUrl: string;
  previewHeroCornerImageEnabled: boolean;
  previewHeroCornerImageSize: number;
  previewHeroBottomLeftImageUrl: string;
  previewHeroBottomLeftImageEnabled: boolean;
  previewHeroBottomLeftImageSize: number;
  previewHeroBottomRightImageUrl: string;
  previewHeroBottomRightImageEnabled: boolean;
  previewHeroBottomRightImageSize: number;
  previewFeaturePromoPrimaryMedia: HomeBannerFormValues['featurePromo']['mediaItems'][number] | undefined;
  uploadingImageTarget: string | null;
  onUploadImage: HomeBannerImageUploadHandler;
  showcaseSearch: string;
  onShowcaseSearchChange: (value: string) => void;
  showcaseSuggestionsPending: boolean;
  showcaseSuggestions: ProductSuggestionDto[];
  selectedShowcaseProducts: ProductSuggestionDto[];
  onAddShowcaseProduct: (product: ProductSuggestionDto) => void;
  onRemoveShowcaseProduct: (productId: string) => void;
  onMoveShowcaseProduct: (productId: string, direction: 'left' | 'right') => void;
  showcaseFeatureGroups: Record<string, BannerShowcaseFeatureItemDto[]>;
  onAddShowcaseFeatureItem: (productId: string) => void;
  onUpdateShowcaseFeatureItem: (
    productId: string,
    index: number,
    field: keyof BannerShowcaseFeatureItemDto,
    value: string
  ) => void;
  onRemoveShowcaseFeatureItem: (productId: string, index: number) => void;
  onSaveHero: () => Promise<void>;
  onSaveHeroSpotlight: () => Promise<void>;
  onSaveAdSlot: (slotKey: HomeAdSlotKey, index: number) => Promise<void>;
  onSaveFeaturePromo: () => Promise<void>;
  onSaveShowcase: () => Promise<void>;
  onResetToSaved: () => void;
  onPreviewSection: (section: EditorSectionKey) => void;
}

export const HomeBannerEditorPanel = ({
  form,
  activeSection,
  onActiveSectionChange,
  canWriteBanner,
  isBootstrapping,
  savingSection,
  preview,
  persistedBanner,
  adSlotFields,
  adSlotMediaArrays,
  featurePromoMediaArray,
  heroSpotlightSearch,
  onHeroSpotlightSearchChange,
  heroSpotlightSuggestionsPending,
  heroSpotlightSuggestions,
  selectedHeroSpotlightProduct,
  onChooseHeroSpotlightProduct,
  onClearHeroSpotlightProduct,
  previewHeroCornerImageUrl,
  previewHeroCornerImageEnabled,
  previewHeroCornerImageSize,
  previewHeroBottomLeftImageUrl,
  previewHeroBottomLeftImageEnabled,
  previewHeroBottomLeftImageSize,
  previewHeroBottomRightImageUrl,
  previewHeroBottomRightImageEnabled,
  previewHeroBottomRightImageSize,
  previewFeaturePromoPrimaryMedia,
  uploadingImageTarget,
  onUploadImage,
  showcaseSearch,
  onShowcaseSearchChange,
  showcaseSuggestionsPending,
  showcaseSuggestions,
  selectedShowcaseProducts,
  onAddShowcaseProduct,
  onRemoveShowcaseProduct,
  onMoveShowcaseProduct,
  showcaseFeatureGroups,
  onAddShowcaseFeatureItem,
  onUpdateShowcaseFeatureItem,
  onRemoveShowcaseFeatureItem,
  onSaveHero,
  onSaveHeroSpotlight,
  onSaveAdSlot,
  onSaveFeaturePromo,
  onSaveShowcase,
  onResetToSaved,
  onPreviewSection
}: HomeBannerEditorPanelProps): JSX.Element => (
  <AdminSurfacePanel>
    <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
      <section className="rounded-[22px] border border-white/10 bg-[#081224]/70 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Editor Switch</p>
            <p className="mt-2 text-sm text-gray-400">Choose one section at a time. Each section saves independently and does not overwrite unsaved edits in the others.</p>
          </div>
          <Badge variant="default" className="bg-white/[0.06] text-gray-300">
            Active:{' '}
            {activeSection === 'hero'
              ? 'Hero'
              : activeSection === 'hero-spotlight'
                ? 'Hero Spotlight'
                : activeSection === 'feature-promo'
                  ? 'Mid-page Promo'
                  : activeSection === 'showcase'
                    ? 'Curated Showcase'
                    : `Advertisement ${slotKeys.indexOf(activeSection as HomeAdSlotKey) + 1}`}
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2">
          {[
            {
              key: 'hero' as const,
              label: 'Hero',
              detail: preview.isActive ? 'Published' : 'Draft'
            },
            {
              key: 'hero-spotlight' as const,
              label: 'Hero Spotlight',
              detail: selectedHeroSpotlightProduct?.name ?? 'Not selected'
            },
            {
              key: 'slot-1' as const,
              label: 'Place 1',
              detail: preview.adSlots[0]?.isActive ? 'Active' : 'Hidden'
            },
            {
              key: 'slot-2' as const,
              label: 'Place 2',
              detail: preview.adSlots[1]?.isActive ? 'Active' : 'Hidden'
            },
            {
              key: 'slot-3' as const,
              label: 'Place 3',
              detail: preview.adSlots[2]?.isActive ? 'Active' : 'Hidden'
            },
            {
              key: 'feature-promo' as const,
              label: 'Mid Promo',
              detail: preview.featurePromo.isActive ? 'Active' : 'Hidden'
            },
            {
              key: 'showcase' as const,
              label: 'Showcase',
              detail: `${selectedShowcaseProducts.length} selected`
            }
          ].map((section) => {
            const isActive = activeSection === section.key;

            return (
              <div
                key={section.key}
                className={`flex min-h-[9.25rem] flex-col rounded-[18px] border px-4 py-3 text-left transition-[border-color,background-color,color,transform] duration-200 ${
                  isActive
                    ? 'border-gold/40 bg-gold/10 text-white shadow-[0_10px_20px_rgba(212,175,55,0.12)]'
                    : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20 hover:bg-white/[0.05]'
                }`}
              >
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onActiveSectionChange(section.key)}
                  className="flex flex-1 flex-col text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{section.label}</span>
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
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-gray-500">{section.detail}</p>
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-3 h-9 w-full justify-center gap-2 rounded-full px-3"
                  title={`Preview ${section.label}`}
                  onClick={() => onPreviewSection(section.key)}
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {activeSection === 'hero' ? (
        <HeroBannerForm
          form={form}
          preview={preview}
          canWriteBanner={canWriteBanner}
          isBootstrapping={isBootstrapping}
          isSaving={savingSection === 'hero'}
          uploadingImageTarget={uploadingImageTarget}
          onUploadImage={onUploadImage}
          onSave={onSaveHero}
        />
      ) : null}

      {activeSection === 'hero-spotlight' ? (
        <HeroSpotlightEditor
          form={form}
          canWriteBanner={canWriteBanner}
          isBootstrapping={isBootstrapping}
          isSaving={savingSection === 'hero-spotlight'}
          heroSpotlightSearch={heroSpotlightSearch}
          onHeroSpotlightSearchChange={onHeroSpotlightSearchChange}
          heroSpotlightSuggestionsPending={heroSpotlightSuggestionsPending}
          heroSpotlightSuggestions={heroSpotlightSuggestions}
          selectedHeroSpotlightProduct={selectedHeroSpotlightProduct}
          onChooseHeroSpotlightProduct={onChooseHeroSpotlightProduct}
          onClearHeroSpotlightProduct={onClearHeroSpotlightProduct}
          previewHeroCornerImageUrl={previewHeroCornerImageUrl}
          previewHeroCornerImageEnabled={previewHeroCornerImageEnabled}
          previewHeroCornerImageSize={previewHeroCornerImageSize}
          previewHeroBottomLeftImageUrl={previewHeroBottomLeftImageUrl}
          previewHeroBottomLeftImageEnabled={previewHeroBottomLeftImageEnabled}
          previewHeroBottomLeftImageSize={previewHeroBottomLeftImageSize}
          previewHeroBottomRightImageUrl={previewHeroBottomRightImageUrl}
          previewHeroBottomRightImageEnabled={previewHeroBottomRightImageEnabled}
          previewHeroBottomRightImageSize={previewHeroBottomRightImageSize}
          preview={preview}
          uploadingImageTarget={uploadingImageTarget}
          onUploadImage={onUploadImage}
          onSave={onSaveHeroSpotlight}
        />
      ) : null}

      {adSlotFields.map((field, index) => {
        const slotKey = field.slotKey as HomeAdSlotKey;
        const slotPreview = preview.adSlots[index];
        const mediaFieldArray = adSlotMediaArrays[index];

        if (activeSection !== slotKey) {
          return null;
        }

        return (
          <AdSlotEditor
            key={field.id}
            form={form}
            index={index}
            slotKey={slotKey}
            slotPreview={slotPreview}
            mediaFieldArray={mediaFieldArray}
            canWriteBanner={canWriteBanner}
            isBootstrapping={isBootstrapping}
            isSaving={savingSection === slotKey}
            uploadingImageTarget={uploadingImageTarget}
            onUploadImage={onUploadImage}
            onSave={onSaveAdSlot}
          />
        );
      })}

      {activeSection === 'feature-promo' ? (
        <FeaturePromoEditor
          form={form}
          preview={preview}
          featurePromoMediaArray={featurePromoMediaArray}
          previewFeaturePromoPrimaryMedia={previewFeaturePromoPrimaryMedia}
          canWriteBanner={canWriteBanner}
          isBootstrapping={isBootstrapping}
          isSaving={savingSection === 'feature-promo'}
          uploadingImageTarget={uploadingImageTarget}
          onUploadImage={onUploadImage}
          onSave={onSaveFeaturePromo}
        />
      ) : null}

      {activeSection === 'showcase' ? (
        <ShowcaseProductSelector
          canWriteBanner={canWriteBanner}
          isBootstrapping={isBootstrapping}
          isSaving={savingSection === 'showcase'}
          showcaseSearch={showcaseSearch}
          onShowcaseSearchChange={onShowcaseSearchChange}
          showcaseSuggestionsPending={showcaseSuggestionsPending}
          showcaseSuggestions={showcaseSuggestions}
          selectedShowcaseProducts={selectedShowcaseProducts}
          onAddShowcaseProduct={onAddShowcaseProduct}
          onRemoveShowcaseProduct={onRemoveShowcaseProduct}
          onMoveShowcaseProduct={onMoveShowcaseProduct}
          showcaseFeatureGroups={showcaseFeatureGroups}
          onAddShowcaseFeatureItem={onAddShowcaseFeatureItem}
          onUpdateShowcaseFeatureItem={onUpdateShowcaseFeatureItem}
          onRemoveShowcaseFeatureItem={onRemoveShowcaseFeatureItem}
          onSave={onSaveShowcase}
        />
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-white/10 pt-1">
        {!canWriteBanner ? <p className="text-sm text-gray-400">This account can preview campaign settings but cannot change them.</p> : null}
        {persistedBanner ? (
          <Button type="button" variant="secondary" onClick={onResetToSaved}>
            Reset All to Saved
          </Button>
        ) : null}
      </div>
    </form>
  </AdminSurfacePanel>
);
