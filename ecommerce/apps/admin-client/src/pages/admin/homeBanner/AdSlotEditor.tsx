import { Badge, Button, Input, Textarea } from '@njstore/ui';
import type { HomeAdSlotKey } from '@njstore/types';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { CampaignEditorSection } from './CampaignEditorSection';
import { HomeBannerImageUploadButton } from './HomeBannerImageUploadButton';
import { MediaItemPreview } from './MediaItemPreview';
import { createEmptyMediaItem, type HomeBannerFormValues } from './homeBannerFormModel';
import type { HomeBannerImageUploadHandler } from './homeBannerUploadTypes';

interface MediaFieldArray {
  fields: Array<{ id: string }>;
  append: (value: HomeBannerFormValues['adSlots'][number]['mediaItems'][number]) => void;
  move: (from: number, to: number) => void;
  remove: (index: number) => void;
}

interface AdSlotEditorProps {
  form: UseFormReturn<HomeBannerFormValues>;
  index: number;
  slotKey: HomeAdSlotKey;
  slotPreview: HomeBannerFormValues['adSlots'][number];
  mediaFieldArray: MediaFieldArray;
  canWriteBanner: boolean;
  isBootstrapping: boolean;
  isSaving: boolean;
  uploadingImageTarget: string | null;
  onUploadImage: HomeBannerImageUploadHandler;
  onSave: (slotKey: HomeAdSlotKey, index: number) => Promise<void>;
}

export const AdSlotEditor = ({
  form,
  index,
  slotKey,
  slotPreview,
  mediaFieldArray,
  canWriteBanner,
  isBootstrapping,
  isSaving,
  uploadingImageTarget,
  onUploadImage,
  onSave
}: AdSlotEditorProps): JSX.Element => {
  const slotMediaErrors = form.formState.errors.adSlots?.[index]?.mediaItems;

  return (
    <CampaignEditorSection
      eyebrow={`Advertisement Place ${index + 1}`}
      title={slotPreview?.title?.trim() || `Advertisement place ${index + 1}`}
      description="Edit this card independently with its own media, text, click path, and visibility."
      summary={slotPreview?.isActive ? 'This slot is active and can appear in the storefront advertisement highlights section.' : 'This slot is hidden until you activate it.'}
      action={
        canWriteBanner ? (
          <Button type="button" size="sm" disabled={isBootstrapping} isLoading={isSaving} onClick={() => void onSave(slotKey, index)}>
            Save Place {index + 1}
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Eyebrow"
          placeholder="Spotlight"
          {...form.register(`adSlots.${index}.eyebrow` as const)}
          error={form.formState.errors.adSlots?.[index]?.eyebrow?.message}
        />
        <div className="rounded-[20px] border border-white/10 bg-[#081224]/80 px-4 py-3 text-sm text-gray-300">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Media Gallery</p>
          <p className="mt-2 text-sm text-gray-400">Add multiple images and videos. The storefront advertisement card rotates through them automatically.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => mediaFieldArray.append(createEmptyMediaItem('image'))}
              disabled={mediaFieldArray.fields.length >= 6}
            >
              Add Image
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => mediaFieldArray.append(createEmptyMediaItem('video'))}
              disabled={mediaFieldArray.fields.length >= 6}
            >
              Add Video
            </Button>
            <Badge variant="default" className="bg-white/[0.06] text-gray-300">
              {mediaFieldArray.fields.length}/6 media
            </Badge>
          </div>
        </div>
        <div className="md:col-span-2">
          <Input
            label="Title"
            placeholder={`Advertisement place ${index + 1}`}
            {...form.register(`adSlots.${index}.title` as const)}
            error={form.formState.errors.adSlots?.[index]?.title?.message}
          />
        </div>
        <div className="md:col-span-2">
          <Textarea
            label="Description"
            className="min-h-24"
            placeholder="Describe the campaign, launch, or short promotional message."
            {...form.register(`adSlots.${index}.description` as const)}
            error={form.formState.errors.adSlots?.[index]?.description?.message}
          />
        </div>
        <div className="md:col-span-2">
          <Input
            label="Ad Click Path"
            placeholder="/shop"
            {...form.register(`adSlots.${index}.ctaUrl` as const)}
            error={form.formState.errors.adSlots?.[index]?.ctaUrl?.message}
          />
        </div>
        <div className="space-y-3 md:col-span-2">
          {mediaFieldArray.fields.length ? (
            mediaFieldArray.fields.map((mediaField, mediaIndex) => (
              <div key={mediaField.id} className="rounded-[20px] border border-white/10 bg-[#081224]/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gold">Media {mediaIndex + 1}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      aria-label={`Move media ${mediaIndex + 1} up`}
                      disabled={mediaIndex === 0}
                      onClick={() => mediaFieldArray.move(mediaIndex, mediaIndex - 1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                      Move Up
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      aria-label={`Move media ${mediaIndex + 1} down`}
                      disabled={mediaIndex === mediaFieldArray.fields.length - 1}
                      onClick={() => mediaFieldArray.move(mediaIndex, mediaIndex + 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                      Move Down
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => mediaFieldArray.remove(mediaIndex)}>
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(13rem,0.38fr)]">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`ad-slot-${index}-media-${mediaIndex}-kind`}
                        className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-400"
                      >
                        Media Type
                      </label>
                      <select
                        id={`ad-slot-${index}-media-${mediaIndex}-kind`}
                        className="w-full rounded-2xl border border-white/10 bg-dark px-4 py-3 text-sm text-white shadow-[0_14px_30px_rgba(0,0,0,0.18)] outline-none transition-colors duration-200 focus:border-gold/40 focus:ring-2 focus:ring-gold/20"
                        {...form.register(`adSlots.${index}.mediaItems.${mediaIndex}.kind` as const)}
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                    <Input
                      label="Alt Text"
                      placeholder="Optional image or video description"
                      {...form.register(`adSlots.${index}.mediaItems.${mediaIndex}.alt` as const)}
                      error={slotMediaErrors?.[mediaIndex]?.alt?.message}
                    />
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <Input
                        label="Media URL"
                        placeholder="https://..."
                        {...form.register(`adSlots.${index}.mediaItems.${mediaIndex}.url` as const)}
                        error={slotMediaErrors?.[mediaIndex]?.url?.message}
                      />
                      <div className="flex items-end">
                        <HomeBannerImageUploadButton
                          label="Upload Image"
                          className="h-12 min-w-[148px] justify-center"
                          target={{
                            uploadKey: `ad-slot-${index}-media-${mediaIndex}`,
                            label: `Advertisement place ${index + 1} media ${mediaIndex + 1}`,
                            urlField: `adSlots.${index}.mediaItems.${mediaIndex}.url` as const,
                            publicIdField: `adSlots.${index}.mediaItems.${mediaIndex}.publicId` as const,
                            altField: `adSlots.${index}.mediaItems.${mediaIndex}.alt` as const,
                            kindField: `adSlots.${index}.mediaItems.${mediaIndex}.kind` as const
                          }}
                          onUploadImage={onUploadImage}
                          isLoading={uploadingImageTarget === `ad-slot-${index}-media-${mediaIndex}`}
                        />
                      </div>
                    </div>
                    <Input
                      label="Media Public ID"
                      placeholder={`home/slot-${index + 1}-${mediaIndex + 1}`}
                      {...form.register(`adSlots.${index}.mediaItems.${mediaIndex}.publicId` as const)}
                      error={slotMediaErrors?.[mediaIndex]?.publicId?.message}
                    />
                  </div>
                  <MediaItemPreview media={slotPreview?.mediaItems?.[mediaIndex]} title={`Media ${mediaIndex + 1}`} />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[20px] border border-dashed border-white/10 bg-[#081224]/60 px-4 py-5 text-sm text-gray-400">
              No media added yet. Add one or more images/videos for this advertisement place.
            </div>
          )}
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#081224]/80 px-4 py-3 text-sm text-gray-300 md:col-span-2">
          <span
            className={`relative flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
              slotPreview?.isActive ? 'bg-gold/70' : 'bg-white/10'
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-white shadow-[0_4px_10px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
                slotPreview?.isActive ? 'translate-x-[1.25rem]' : 'translate-x-0.5'
              }`}
            />
          </span>
          <input type="checkbox" className="sr-only" {...form.register(`adSlots.${index}.isActive` as const)} />
          Activate advertisement place {index + 1}
        </label>
      </div>
    </CampaignEditorSection>
  );
};
