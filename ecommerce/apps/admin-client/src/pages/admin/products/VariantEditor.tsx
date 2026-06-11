import type { ChangeEvent, MutableRefObject } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { ImagePlus, Plus, Trash2, Upload } from 'lucide-react';
import { Button, Input } from '@njstore/ui';
import type { ProductFormValues } from './productFormModel';
import { ProductFormSection } from './ProductFormSection';

interface ProductEditorField {
  id: string;
}

interface VariantEditorProps {
  form: UseFormReturn<ProductFormValues>;
  variantFields: ProductEditorField[];
  watchedVariants: ProductFormValues['variants'];
  variantImageInputRefs: MutableRefObject<Record<number, HTMLInputElement | null>>;
  uploadingImageTarget: string | null;
  onAppendVariant: () => void;
  onRemoveVariantRow: (index: number) => void;
  onAddVariantImageRow: (variantIndex: number) => void;
  onRemoveVariantImageRow: (variantIndex: number, imageIndex: number) => void;
  onUploadVariantImages: (variantIndex: number) => (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const VariantEditor = ({
  form,
  variantFields,
  watchedVariants,
  variantImageInputRefs,
  uploadingImageTarget,
  onAppendVariant,
  onRemoveVariantRow,
  onAddVariantImageRow,
  onRemoveVariantImageRow,
  onUploadVariantImages
}: VariantEditorProps): JSX.Element => (
  <ProductFormSection id="product-editor-variants" title="Variants" description="List the options customers can choose from, including stock, SKU, and optional price overrides.">
    <div className="space-y-4">
      {variantFields.map((field, index) => {
        const customAttributes = watchedVariants?.[index]?.attributes ?? [];
        const addCustomAttribute = (): void => {
          const currentAttributes = form.getValues(`variants.${index}.attributes`) ?? [];
          form.setValue(`variants.${index}.attributes`, [...currentAttributes, { name: '', value: '' }], {
            shouldDirty: true,
            shouldValidate: true
          });
        };
        const removeCustomAttribute = (attributeIndex: number): void => {
          const currentAttributes = form.getValues(`variants.${index}.attributes`) ?? [];
          form.setValue(
            `variants.${index}.attributes`,
            currentAttributes.filter((_, currentIndex) => currentIndex !== attributeIndex),
            { shouldDirty: true, shouldValidate: true }
          );
        };

        return (
          <div key={field.id} className="rounded-lg border border-white/10 bg-white/[0.055] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">Variant {index + 1}</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Use Color, Storage, and Model when they fit. Add custom options below for RAM, size, connectivity, paper type, warranty, or anything else.
                </p>
                {watchedVariants?.[index]?.images?.length ? (
                  <p className="mt-1 text-xs text-gray-500">
                    Preserving {watchedVariants[index]?.images?.length} variant image
                    {watchedVariants[index]?.images?.length === 1 ? '' : 's'} for the storefront gallery.
                  </p>
                ) : null}
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => onRemoveVariantRow(index)}>
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Input label="Variant SKU" placeholder="NJ-S24U-BLK-256" {...form.register(`variants.${index}.sku`)} error={form.formState.errors.variants?.[index]?.sku?.message} />
              <Input label="Stock" type="number" placeholder="12" {...form.register(`variants.${index}.stock`)} error={form.formState.errors.variants?.[index]?.stock?.message} />
              <Input label="Color" placeholder="Titanium Black" {...form.register(`variants.${index}.color`)} error={form.formState.errors.variants?.[index]?.color?.message} />
              <Input label="Color Code" placeholder="#111827" {...form.register(`variants.${index}.colorCode`)} error={form.formState.errors.variants?.[index]?.colorCode?.message} />
              <Input
                label="Glow Color"
                placeholder="#3B82F6"
                {...form.register(`variants.${index}.glowColor`)}
                error={form.formState.errors.variants?.[index]?.glowColor?.message}
              />
              <Input label="Storage" placeholder="256GB" {...form.register(`variants.${index}.storage`)} error={form.formState.errors.variants?.[index]?.storage?.message} />
              <Input label="Model / Edition" placeholder="International Version" {...form.register(`variants.${index}.model`)} error={form.formState.errors.variants?.[index]?.model?.message} />
              <Input
                label="Price Override"
                type="number"
                placeholder="359900"
                {...form.register(`variants.${index}.price`)}
                error={form.formState.errors.variants?.[index]?.price?.message}
              />
            </div>

            <div className="mt-5 rounded-lg border border-white/10 bg-black/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Custom Variant Options</p>
                  <p className="mt-2 text-xs leading-6 text-gray-400">
                    Add category-specific selectors. Examples: RAM 16GB, Screen 15 inch, Connectivity Wi-Fi, Paper Size A4.
                  </p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={addCustomAttribute}>
                  <Plus className="h-4 w-4" />
                  Add option
                </Button>
              </div>

              {customAttributes.length ? (
                <div className="mt-4 grid gap-3">
                  {customAttributes.map((_, attributeIndex) => (
                    <div key={`${field.id}-attribute-${attributeIndex}`} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3 md:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)_auto] md:items-end">
                      <Input
                        label="Option Name"
                        placeholder="RAM"
                        {...form.register(`variants.${index}.attributes.${attributeIndex}.name`)}
                        error={form.formState.errors.variants?.[index]?.attributes?.[attributeIndex]?.name?.message}
                      />
                      <Input
                        label="Value"
                        placeholder="16GB"
                        {...form.register(`variants.${index}.attributes.${attributeIndex}.value`)}
                        error={form.formState.errors.variants?.[index]?.attributes?.[attributeIndex]?.value?.message}
                      />
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeCustomAttribute(attributeIndex)}>
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-white/10 bg-white/[0.025] px-4 py-4 text-sm text-gray-500">
                  No custom options yet. Add one when this product needs selectors beyond Color, Storage, or Model.
                </div>
              )}
            </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-dark-light/40 p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="max-w-2xl">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Variant Gallery</p>
                <p className="mt-2 text-xs leading-6 text-gray-400">
                  These images appear on the product detail page when this exact variant is selected. Leave empty to fall back to the product gallery.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <input
                  ref={(node) => {
                    variantImageInputRefs.current[index] = node;
                  }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(event) => void onUploadVariantImages(index)(event)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => variantImageInputRefs.current[index]?.click()}
                  isLoading={uploadingImageTarget === `variant-images-${index}`}
                >
                  <Upload className="h-4 w-4" />
                  Upload Variant Images
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => onAddVariantImageRow(index)}>
                  <ImagePlus className="h-4 w-4" />
                  Add Image Row
                </Button>
              </div>
            </div>

            {(watchedVariants?.[index]?.images ?? []).length ? (
              <div className="mt-4 space-y-4">
                {(watchedVariants?.[index]?.images ?? []).map((image, imageIndex) => (
                  <div key={`${field.id}-variant-image-${imageIndex}`} className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">Variant Image {imageIndex + 1}</p>
                      <Button type="button" size="sm" variant="ghost" onClick={() => onRemoveVariantImageRow(index, imageIndex)}>
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                      <div className="aspect-[16/10] overflow-hidden rounded-lg border border-white/10 bg-dark-light/60">
                        {image?.url ? (
                          <img
                            src={image.url}
                            alt={image.alt || `Variant preview ${imageIndex + 1}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="flex h-full min-h-[180px] items-center justify-center px-4 text-center text-xs text-gray-500">
                            Paste a variant image URL to preview it here.
                          </div>
                        )}
                      </div>

                      <div className="grid gap-4">
                        <Input
                          label="Image URL"
                          placeholder="https://res.cloudinary.com/..."
                          {...form.register(`variants.${index}.images.${imageIndex}.url`)}
                          error={form.formState.errors.variants?.[index]?.images?.[imageIndex]?.url?.message}
                        />
                        <Input
                          label="Cloudinary Public ID"
                          placeholder="njstore/products/product-variant"
                          {...form.register(`variants.${index}.images.${imageIndex}.publicId`)}
                          error={form.formState.errors.variants?.[index]?.images?.[imageIndex]?.publicId?.message}
                        />
                        <Input
                          label="Alt Text"
                          placeholder="Blue 256GB product view"
                          {...form.register(`variants.${index}.images.${imageIndex}.alt`)}
                          error={form.formState.errors.variants?.[index]?.images?.[imageIndex]?.alt?.message}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-white/10 bg-black/10 px-4 py-4 text-sm text-gray-500">
                No dedicated variant images yet. The storefront will use the main product gallery for this option until you add some.
              </div>
            )}
          </div>
        </div>
        );
      })}

      {typeof form.formState.errors.variants?.message === 'string' ? <p className="text-xs text-red-400">{form.formState.errors.variants.message}</p> : null}

      <Button type="button" variant="secondary" onClick={onAppendVariant}>
        <Plus className="h-4 w-4" />
        Add another variant
      </Button>
    </div>
  </ProductFormSection>
);
