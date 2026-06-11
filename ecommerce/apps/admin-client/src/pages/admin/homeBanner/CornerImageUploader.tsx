import type { UseFormReturn } from 'react-hook-form';
import { Button, Input } from '@njstore/ui';
import { HomeBannerImageUploadButton } from './HomeBannerImageUploadButton';
import {
  maxHeroCornerImageSize,
  minHeroCornerImageSize,
  type HomeBannerFormValues
} from './homeBannerFormModel';
import type { HomeBannerImageUploadHandler } from './homeBannerUploadTypes';

type CornerImageUrlField =
  | 'heroCornerImageUrl'
  | 'heroBottomLeftImageUrl'
  | 'heroBottomRightImageUrl';
type CornerImagePublicIdField =
  | 'heroCornerImagePublicId'
  | 'heroBottomLeftImagePublicId'
  | 'heroBottomRightImagePublicId';
type CornerImageAltField =
  | 'heroCornerImageAlt'
  | 'heroBottomLeftImageAlt'
  | 'heroBottomRightImageAlt';
type CornerImageSizeField =
  | 'heroCornerImageSize'
  | 'heroBottomLeftImageSize'
  | 'heroBottomRightImageSize';
type CornerImageEnabledField =
  | 'heroCornerImageEnabled'
  | 'heroBottomLeftImageEnabled'
  | 'heroBottomRightImageEnabled';

interface CornerImageUploaderProps {
  form: UseFormReturn<HomeBannerFormValues>;
  title: string;
  description: string;
  enabled: boolean;
  url: string;
  alt: string;
  size: number;
  urlField: CornerImageUrlField;
  publicIdField: CornerImagePublicIdField;
  altField: CornerImageAltField;
  sizeField: CornerImageSizeField;
  enabledField: CornerImageEnabledField;
  urlError?: string;
  publicIdError?: string;
  altError?: string;
  sizeError?: string;
  previewMessage: string;
  emptyMessage: string;
  uploadKey: string;
  uploadingImageTarget: string | null;
  onUploadImage: HomeBannerImageUploadHandler;
}

export const CornerImageUploader = ({
  form,
  title,
  description,
  enabled,
  url,
  alt,
  size,
  urlField,
  publicIdField,
  altField,
  sizeField,
  enabledField,
  urlError,
  publicIdError,
  altError,
  sizeError,
  previewMessage,
  emptyMessage,
  uploadKey,
  uploadingImageTarget,
  onUploadImage
}: CornerImageUploaderProps): JSX.Element => (
  <div className="rounded-[20px] border border-white/10 bg-[#081224]/80 p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-gold">{title}</p>
        <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant={enabled ? 'primary' : 'secondary'}
        aria-label={`${title} visibility`}
        onClick={() =>
          form.setValue(enabledField, !enabled, {
            shouldDirty: true,
            shouldTouch: true
          })
        }
      >
        {enabled ? 'On' : 'Off'}
      </Button>
    </div>
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          label={`${title} URL`}
          placeholder="https://..."
          {...form.register(urlField)}
          error={urlError}
        />
        <div className="flex items-end">
          <HomeBannerImageUploadButton
            label="Upload Image"
            className="h-12 min-w-[148px] justify-center"
            target={{
              uploadKey,
              label: title,
              urlField,
              publicIdField,
              altField
            }}
            onUploadImage={onUploadImage}
            isLoading={uploadingImageTarget === uploadKey}
          />
        </div>
      </div>
      <Input
        label={`${title} Public ID`}
        placeholder="banners/hero-badge"
        {...form.register(publicIdField)}
        error={publicIdError}
      />
      <Input
        label={`${title} Alt Text`}
        placeholder="Hero badge"
        {...form.register(altField)}
        error={altError}
      />
      <Input
        label={`${title} Size (px)`}
        type="number"
        min={minHeroCornerImageSize}
        max={maxHeroCornerImageSize}
        {...form.register(sizeField, { valueAsNumber: true })}
        error={sizeError}
      />
    </div>
    <div className="mt-4 rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] p-4">
      {url && enabled ? (
        <div className="flex flex-wrap items-center gap-4">
          <img
            src={url}
            alt={alt}
            className="h-auto w-auto object-contain"
            loading="lazy"
            decoding="async"
            style={{
              width: size,
              maxWidth: size,
              maxHeight: size
            }}
          />
          <p className="text-sm text-gray-400">{previewMessage}</p>
        </div>
      ) : url ? (
        <p className="text-sm text-gray-400">This image is saved, but it is currently turned off on the storefront.</p>
      ) : (
        <p className="text-sm text-gray-400">{emptyMessage}</p>
      )}
    </div>
  </div>
);
