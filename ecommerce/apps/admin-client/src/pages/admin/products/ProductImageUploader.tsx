import type { ChangeEvent, MutableRefObject } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { Button, Input } from '@njstore/ui';
import type { ProductFormValues, ProductImageFormValue } from './productFormModel';
import { ProductFormSection } from './ProductFormSection';

interface ProductEditorField {
  id: string;
}

interface ProductImageUploaderProps {
  form: UseFormReturn<ProductFormValues>;
  imageFields: ProductEditorField[];
  watchedImages: ProductImageFormValue[];
  productImagesInputRef: MutableRefObject<HTMLInputElement | null>;
  uploadingImageTarget: string | null;
  onUploadMainImages: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onAppendImage: () => void;
  onRemoveImageRow: (index: number) => void;
}

export const ProductImageUploader = ({
  form,
  imageFields,
  watchedImages,
  productImagesInputRef,
  uploadingImageTarget,
  onUploadMainImages,
  onAppendImage,
  onRemoveImageRow
}: ProductImageUploaderProps): JSX.Element => (
  <ProductFormSection id="product-editor-images" title="Product Images" description="Add one or more storefront images. Each image can include an alt label for accessibility.">
    <div className="space-y-4">
      {imageFields.map((field, index) => {
        const currentImage = watchedImages[index];

        return (
          <div key={field.id} className="rounded-lg border border-white/10 bg-white/[0.055] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Image {index + 1}</p>
                <p className="mt-0.5 text-xs text-gray-500">{currentImage?.url ? 'Preview ready' : 'Waiting for image URL'}</p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => onRemoveImageRow(index)}>
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
              <div className="relative flex aspect-[4/3] min-h-[220px] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#070d18] p-3 lg:aspect-square lg:min-h-0">
                {currentImage?.url ? (
                  <img src={currentImage.url} alt={currentImage.alt || `Preview ${index + 1}`} className="max-h-full max-w-full object-contain" loading="lazy" decoding="async" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-xs text-gray-500">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-gray-400">
                      <ImagePlus className="h-5 w-5" />
                    </span>
                    <span>Paste an image URL to preview it here.</span>
                  </div>
                )}
              </div>

              <div className="grid min-w-0 gap-4">
                <Input
                  label="Image URL"
                  placeholder="https://res.cloudinary.com/..."
                  {...form.register(`images.${index}.url`)}
                  error={form.formState.errors.images?.[index]?.url?.message}
                />
                <Input
                  label="Cloudinary Public ID"
                  placeholder="njstore/products/product-main"
                  {...form.register(`images.${index}.publicId`)}
                  error={form.formState.errors.images?.[index]?.publicId?.message}
                />
                <Input
                  label="Alt Text"
                  placeholder="Front-facing product image"
                  {...form.register(`images.${index}.alt`)}
                  error={form.formState.errors.images?.[index]?.alt?.message}
                />
              </div>
            </div>
          </div>
        );
      })}

      {typeof form.formState.errors.images?.message === 'string' ? <p className="text-xs text-red-400">{form.formState.errors.images.message}</p> : null}

      <div className="flex flex-wrap gap-3">
        <input
          ref={productImagesInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(event) => void onUploadMainImages(event)}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => productImagesInputRef.current?.click()}
          isLoading={uploadingImageTarget === 'product-images'}
        >
          <Upload className="h-4 w-4" />
          Upload Images
        </Button>
        <Button type="button" variant="secondary" onClick={onAppendImage}>
          <ImagePlus className="h-4 w-4" />
          Add another image
        </Button>
      </div>
    </div>
  </ProductFormSection>
);
