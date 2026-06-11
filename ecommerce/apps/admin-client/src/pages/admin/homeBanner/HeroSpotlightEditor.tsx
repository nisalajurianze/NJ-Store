import { Badge, Button, Input } from '@njstore/ui';
import type { ProductSuggestionDto } from '@njstore/types';
import type { UseFormReturn } from 'react-hook-form';
import { CampaignEditorSection } from './CampaignEditorSection';
import { CornerImageUploader } from './CornerImageUploader';
import type { HomeBannerFormValues } from './homeBannerFormModel';
import type { HomeBannerImageUploadHandler } from './homeBannerUploadTypes';

interface HeroSpotlightEditorProps {
  form: UseFormReturn<HomeBannerFormValues>;
  canWriteBanner: boolean;
  isBootstrapping: boolean;
  isSaving: boolean;
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
  preview: HomeBannerFormValues;
  uploadingImageTarget: string | null;
  onUploadImage: HomeBannerImageUploadHandler;
  onSave: () => Promise<void>;
}

export const HeroSpotlightEditor = ({
  form,
  canWriteBanner,
  isBootstrapping,
  isSaving,
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
  preview,
  uploadingImageTarget,
  onUploadImage,
  onSave
}: HeroSpotlightEditorProps): JSX.Element => (
  <CampaignEditorSection
    eyebrow="Hero Spotlight"
    title="Featured Hero Product"
    description="Choose the product highlighted in the hero visual stage, and optionally upload a corner image such as a warranty badge or launch sticker."
    summary={
      selectedHeroSpotlightProduct
        ? `${selectedHeroSpotlightProduct.name} is currently featured in the hero spotlight.${previewHeroCornerImageUrl ? ' A corner image is also configured.' : ''}`
        : previewHeroCornerImageUrl
          ? 'A corner image is configured for the hero spotlight.'
          : 'No dedicated hero spotlight product selected yet.'
    }
    action={
      canWriteBanner ? (
        <Button type="button" size="sm" disabled={isBootstrapping} isLoading={isSaving} onClick={() => void onSave()}>
          Save Hero Spotlight
        </Button>
      ) : undefined
    }
  >
    <div className="space-y-4">
      <Input
        label="Find Product"
        placeholder="Search by product name or brand"
        value={heroSpotlightSearch}
        onChange={(event) => onHeroSpotlightSearchChange(event.target.value)}
      />

      {heroSpotlightSearch.trim().length >= 2 ? (
        <div className="rounded-[20px] border border-white/10 bg-[#081224]/80 p-3">
          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-gray-400">Search Results</p>
          <div className="space-y-2">
            {heroSpotlightSuggestionsPending ? (
              <p className="text-sm text-gray-400">Searching products…</p>
            ) : heroSpotlightSuggestions.length ? (
              heroSpotlightSuggestions.map((product) => {
                const isSelected = selectedHeroSpotlightProduct?.id === product.id;

                return (
                  <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{product.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">LKR {product.price.toLocaleString()}</p>
                    </div>
                    <Button type="button" size="sm" variant={isSelected ? 'secondary' : 'primary'} onClick={() => onChooseHeroSpotlightProduct(product)}>
                      {isSelected ? 'Selected' : selectedHeroSpotlightProduct ? 'Replace Spotlight' : 'Use in Hero'}
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-400">No matching products found for this search.</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="rounded-[20px] border border-white/10 bg-[#081224]/80 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Selected Product</p>
          <Badge variant="default" className="bg-white/[0.06] text-gray-300">
            {selectedHeroSpotlightProduct ? '1/1 selected' : '0/1 selected'}
          </Badge>
        </div>
        {selectedHeroSpotlightProduct ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
            <div>
              <p className="text-sm font-medium text-white">{selectedHeroSpotlightProduct.name}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">LKR {selectedHeroSpotlightProduct.price.toLocaleString()}</p>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={onClearHeroSpotlightProduct}>
              Remove
            </Button>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No hero spotlight product selected yet. Pick one from the search results above.</p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <CornerImageUploader
          form={form}
          title="Top Right Image"
          description="Optional badge art for the top-right corner. Use it for warranty marks, launch stickers, or brand assets."
          enabled={previewHeroCornerImageEnabled}
          url={previewHeroCornerImageUrl}
          alt={preview.heroCornerImageAlt?.trim() || 'Top right hero badge preview'}
          size={previewHeroCornerImageSize}
          urlField="heroCornerImageUrl"
          publicIdField="heroCornerImagePublicId"
          altField="heroCornerImageAlt"
          sizeField="heroCornerImageSize"
          enabledField="heroCornerImageEnabled"
          urlError={form.formState.errors.heroCornerImageUrl?.message}
          publicIdError={form.formState.errors.heroCornerImagePublicId?.message}
          altError={form.formState.errors.heroCornerImageAlt?.message}
          sizeError={form.formState.errors.heroCornerImageSize?.message}
          previewMessage="This image appears in the top-right corner of the storefront hero spotlight."
          emptyMessage="Leave this empty if you do not want a top-right hero badge."
          uploadKey="hero-corner-top-right"
          uploadingImageTarget={uploadingImageTarget}
          onUploadImage={onUploadImage}
        />
        <CornerImageUploader
          form={form}
          title="Bottom Left Image"
          description="Optional art for the bottom-left corner. This works well for delivery, gifting, or service badges."
          enabled={previewHeroBottomLeftImageEnabled}
          url={previewHeroBottomLeftImageUrl}
          alt={preview.heroBottomLeftImageAlt?.trim() || 'Bottom left hero badge preview'}
          size={previewHeroBottomLeftImageSize}
          urlField="heroBottomLeftImageUrl"
          publicIdField="heroBottomLeftImagePublicId"
          altField="heroBottomLeftImageAlt"
          sizeField="heroBottomLeftImageSize"
          enabledField="heroBottomLeftImageEnabled"
          urlError={form.formState.errors.heroBottomLeftImageUrl?.message}
          publicIdError={form.formState.errors.heroBottomLeftImagePublicId?.message}
          altError={form.formState.errors.heroBottomLeftImageAlt?.message}
          sizeError={form.formState.errors.heroBottomLeftImageSize?.message}
          previewMessage="This image appears in the bottom-left corner of the storefront hero spotlight."
          emptyMessage="Leave this empty if you do not want a bottom-left hero badge."
          uploadKey="hero-corner-bottom-left"
          uploadingImageTarget={uploadingImageTarget}
          onUploadImage={onUploadImage}
        />
        <CornerImageUploader
          form={form}
          title="Bottom Right Image"
          description="Optional art for the bottom-right corner. Use it for trade-in, financing, or promo support visuals."
          enabled={previewHeroBottomRightImageEnabled}
          url={previewHeroBottomRightImageUrl}
          alt={preview.heroBottomRightImageAlt?.trim() || 'Bottom right hero badge preview'}
          size={previewHeroBottomRightImageSize}
          urlField="heroBottomRightImageUrl"
          publicIdField="heroBottomRightImagePublicId"
          altField="heroBottomRightImageAlt"
          sizeField="heroBottomRightImageSize"
          enabledField="heroBottomRightImageEnabled"
          urlError={form.formState.errors.heroBottomRightImageUrl?.message}
          publicIdError={form.formState.errors.heroBottomRightImagePublicId?.message}
          altError={form.formState.errors.heroBottomRightImageAlt?.message}
          sizeError={form.formState.errors.heroBottomRightImageSize?.message}
          previewMessage="This image appears in the bottom-right corner of the storefront hero spotlight."
          emptyMessage="Leave this empty if you do not want a bottom-right hero badge."
          uploadKey="hero-corner-bottom-right"
          uploadingImageTarget={uploadingImageTarget}
          onUploadImage={onUploadImage}
        />
      </div>
    </div>
  </CampaignEditorSection>
);
