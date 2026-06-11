import { Badge, Button, Input, Textarea } from '@njstore/ui';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { CampaignEditorSection } from './CampaignEditorSection';
import { HomeBannerImageUploadButton } from './HomeBannerImageUploadButton';
import { MediaItemPreview } from './MediaItemPreview';
import { createEmptyMediaItem, type HomeBannerFormValues } from './homeBannerFormModel';
import type { HomeBannerImageUploadHandler } from './homeBannerUploadTypes';

interface MediaFieldArray {
  fields: Array<{ id: string }>;
  append: (value: HomeBannerFormValues['featurePromo']['mediaItems'][number]) => void;
  move: (from: number, to: number) => void;
  remove: (index: number) => void;
}

interface FeaturePromoEditorProps {
  form: UseFormReturn<HomeBannerFormValues>;
  preview: HomeBannerFormValues;
  featurePromoMediaArray: MediaFieldArray;
  previewFeaturePromoPrimaryMedia: HomeBannerFormValues['featurePromo']['mediaItems'][number] | undefined;
  canWriteBanner: boolean;
  isBootstrapping: boolean;
  isSaving: boolean;
  uploadingImageTarget: string | null;
  onUploadImage: HomeBannerImageUploadHandler;
  onSave: () => Promise<void>;
}

export const FeaturePromoEditor = ({
  form,
  preview,
  featurePromoMediaArray,
  previewFeaturePromoPrimaryMedia,
  canWriteBanner,
  isBootstrapping,
  isSaving,
  uploadingImageTarget,
  onUploadImage,
  onSave
}: FeaturePromoEditorProps): JSX.Element => (
  <CampaignEditorSection
    eyebrow="Mid-page Promo"
    title={preview.featurePromo.title?.trim() || 'Wide storefront promo'}
    description="This is the full-width campaign block placed between New Arrivals and Brands on the storefront."
    summary={
      preview.featurePromo.isActive
        ? 'This promo is active and can appear between the latest products and the brand carousel.'
        : 'This promo stays hidden until you activate it.'
    }
    action={
      canWriteBanner ? (
        <Button type="button" size="sm" disabled={isBootstrapping} isLoading={isSaving} onClick={() => void onSave()}>
          Save Mid Promo
        </Button>
      ) : undefined
    }
  >
    <div className="grid gap-4 md:grid-cols-2">
      <Input
        label="Eyebrow"
        placeholder="2025 AI TVs"
        {...form.register('featurePromo.eyebrow')}
        error={form.formState.errors.featurePromo?.eyebrow?.message}
      />
      <div className="rounded-[20px] border border-white/10 bg-[#081224]/80 px-4 py-3 text-sm text-gray-300">
        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Media Gallery</p>
        <p className="mt-2 text-sm text-gray-400">Add one or more images/videos. The storefront promo can rotate through them automatically.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => featurePromoMediaArray.append(createEmptyMediaItem('image'))}
            disabled={featurePromoMediaArray.fields.length >= 6}
          >
            Add Image
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => featurePromoMediaArray.append(createEmptyMediaItem('video'))}
            disabled={featurePromoMediaArray.fields.length >= 6}
          >
            Add Video
          </Button>
          <Badge variant="default" className="bg-white/[0.06] text-gray-300">
            {featurePromoMediaArray.fields.length}/6 media
          </Badge>
        </div>
      </div>
      <div className="md:col-span-2">
        <Input
          label="Title"
          placeholder="2025 AI TVs"
          {...form.register('featurePromo.title')}
          error={form.formState.errors.featurePromo?.title?.message}
        />
      </div>
      <div className="md:col-span-2">
        <Textarea
          label="Description"
          className="min-h-24"
          placeholder="Explore new AI TVs and seasonal campaign highlights."
          {...form.register('featurePromo.description')}
          error={form.formState.errors.featurePromo?.description?.message}
        />
      </div>
      <Input
        label="Primary CTA Text"
        placeholder="Learn more"
        {...form.register('featurePromo.ctaText')}
        error={form.formState.errors.featurePromo?.ctaText?.message}
      />
      <Input
        label="Primary CTA Path"
        placeholder="/shop"
        {...form.register('featurePromo.ctaUrl')}
        error={form.formState.errors.featurePromo?.ctaUrl?.message}
      />
      <Input
        label="Secondary CTA Text"
        placeholder="View all"
        {...form.register('featurePromo.secondaryCtaText')}
        error={form.formState.errors.featurePromo?.secondaryCtaText?.message}
      />
      <Input
        label="Secondary CTA Path"
        placeholder="/shop?featured=true"
        {...form.register('featurePromo.secondaryCtaUrl')}
        error={form.formState.errors.featurePromo?.secondaryCtaUrl?.message}
      />
      <div className="space-y-3 md:col-span-2">
        {featurePromoMediaArray.fields.length ? (
          featurePromoMediaArray.fields.map((mediaField, mediaIndex) => (
            <div key={mediaField.id} className="rounded-[20px] border border-white/10 bg-[#081224]/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gold">Promo Media {mediaIndex + 1}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    aria-label={`Move promo media ${mediaIndex + 1} up`}
                    disabled={mediaIndex === 0}
                    onClick={() => featurePromoMediaArray.move(mediaIndex, mediaIndex - 1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                    Move Up
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    aria-label={`Move promo media ${mediaIndex + 1} down`}
                    disabled={mediaIndex === featurePromoMediaArray.fields.length - 1}
                    onClick={() => featurePromoMediaArray.move(mediaIndex, mediaIndex + 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                    Move Down
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => featurePromoMediaArray.remove(mediaIndex)}>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(13rem,0.38fr)]">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`feature-promo-media-${mediaIndex}-kind`}
                      className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-400"
                    >
                      Media Type
                    </label>
                    <select
                      id={`feature-promo-media-${mediaIndex}-kind`}
                      className="w-full rounded-2xl border border-white/10 bg-dark px-4 py-3 text-sm text-white shadow-[0_14px_30px_rgba(0,0,0,0.18)] outline-none transition-colors duration-200 focus:border-gold/40 focus:ring-2 focus:ring-gold/20"
                      {...form.register(`featurePromo.mediaItems.${mediaIndex}.kind` as const)}
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </div>
                  <Input
                    label="Alt Text"
                    placeholder="Optional image or video description"
                    {...form.register(`featurePromo.mediaItems.${mediaIndex}.alt` as const)}
                    error={form.formState.errors.featurePromo?.mediaItems?.[mediaIndex]?.alt?.message}
                  />
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Input
                      label="Media URL"
                      placeholder="https://..."
                      {...form.register(`featurePromo.mediaItems.${mediaIndex}.url` as const)}
                      error={form.formState.errors.featurePromo?.mediaItems?.[mediaIndex]?.url?.message}
                    />
                    <div className="flex items-end">
                      <HomeBannerImageUploadButton
                        label="Upload Image"
                        className="h-12 min-w-[148px] justify-center"
                        target={{
                          uploadKey: `feature-promo-media-${mediaIndex}`,
                          label: `Mid-page promo media ${mediaIndex + 1}`,
                          urlField: `featurePromo.mediaItems.${mediaIndex}.url` as const,
                          publicIdField: `featurePromo.mediaItems.${mediaIndex}.publicId` as const,
                          altField: `featurePromo.mediaItems.${mediaIndex}.alt` as const,
                          kindField: `featurePromo.mediaItems.${mediaIndex}.kind` as const
                        }}
                        onUploadImage={onUploadImage}
                        isLoading={uploadingImageTarget === `feature-promo-media-${mediaIndex}`}
                      />
                    </div>
                  </div>
                  <Input
                    label="Media Public ID"
                    placeholder={`home/feature-promo-${mediaIndex + 1}`}
                    {...form.register(`featurePromo.mediaItems.${mediaIndex}.publicId` as const)}
                    error={form.formState.errors.featurePromo?.mediaItems?.[mediaIndex]?.publicId?.message}
                  />
                </div>
                <MediaItemPreview media={preview.featurePromo.mediaItems[mediaIndex]} title={`Promo Media ${mediaIndex + 1}`} />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-white/10 bg-[#081224]/60 px-4 py-5 text-sm text-gray-400">
            No media added yet. Add one or more images/videos for this wide promo.
          </div>
        )}
      </div>
      <div className="rounded-[20px] border border-dashed border-white/10 bg-[#081224]/60 p-4 md:col-span-2">
        {previewFeaturePromoPrimaryMedia ? (
          previewFeaturePromoPrimaryMedia.kind === 'video' ? (
            <div className="space-y-3">
              <video src={previewFeaturePromoPrimaryMedia.url} className="max-h-64 w-full rounded-[16px] object-cover" muted autoPlay loop playsInline />
              <p className="text-sm text-gray-400">The first media item acts as the preview here. Multiple media items rotate on the storefront.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <img
                src={previewFeaturePromoPrimaryMedia.url}
                alt={previewFeaturePromoPrimaryMedia.alt?.trim() || preview.featurePromo.title?.trim() || 'Mid-page promo preview'}
                className="max-h-64 w-full rounded-[16px] object-contain bg-white p-4"
                loading="lazy"
                decoding="async"
              />
              <p className="text-sm text-gray-400">The first media item acts as the preview here. Multiple media items rotate on the storefront.</p>
            </div>
          )
        ) : (
          <p className="text-sm text-gray-400">You can keep this promo text-only, or add visual media to match the wide campaign layout.</p>
        )}
      </div>
      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#081224]/80 px-4 py-3 text-sm text-gray-300 md:col-span-2">
        <span
          className={`relative flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
            preview.featurePromo.isActive ? 'bg-gold/70' : 'bg-white/10'
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-white shadow-[0_4px_10px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
              preview.featurePromo.isActive ? 'translate-x-[1.25rem]' : 'translate-x-0.5'
            }`}
          />
        </span>
        <input type="checkbox" className="sr-only" {...form.register('featurePromo.isActive')} />
        Activate the mid-page promo between New Arrivals and Brands
      </label>
    </div>
  </CampaignEditorSection>
);
