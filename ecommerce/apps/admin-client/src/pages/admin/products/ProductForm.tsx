import type { UseFormReturn } from 'react-hook-form';
import { ListPlus, Plus, Trash2 } from 'lucide-react';
import { Button, DatePicker, Input, Textarea } from '@njstore/ui';
import type {
  BrandRecord,
  ProductEditorSection,
  ProductFormValues,
  ProductRecord
} from './productFormModel';
import { ProductFormSection } from './ProductFormSection';

interface ProductEditorField {
  id: string;
}

interface ProductFormProps {
  form: UseFormReturn<ProductFormValues>;
  activeSection: ProductEditorSection;
  selectClassName: string;
  categoryOptions: Array<{ id: string; name: string }>;
  brandOptions: BrandRecord[];
  bundleCandidateProducts: ProductRecord[];
  bundleItemFields: ProductEditorField[];
  specificationFields: ProductEditorField[];
  watchedProductType: ProductFormValues['productType'];
  watchedIsFlashDeal: boolean;
  watchedBundleItems: ProductFormValues['bundleItems'];
  onAppendBundleItem: () => void;
  onRemoveBundleItemRow: (index: number) => void;
  onAppendSpecification: () => void;
  onRemoveSpecificationRow: (index: number) => void;
}

export const ProductForm = ({
  form,
  activeSection,
  selectClassName,
  categoryOptions,
  brandOptions,
  bundleCandidateProducts,
  bundleItemFields,
  specificationFields,
  watchedProductType,
  watchedIsFlashDeal,
  watchedBundleItems,
  onAppendBundleItem,
  onRemoveBundleItemRow,
  onAppendSpecification,
  onRemoveSpecificationRow
}: ProductFormProps): JSX.Element => (
  <div className="space-y-4">
    {activeSection === 'details' ? (
    <ProductFormSection id="product-editor-details" title="Product Details" description="Name, category, brand, SKU, and the main product copy.">
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Product Name" placeholder="Galaxy S24 Ultra" {...form.register('name')} error={form.formState.errors.name?.message} />
        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span>Offer Type</span>
          <select className={selectClassName} {...form.register('productType')}>
            <option value="standard">Standard product</option>
            <option value="bundle">Bundle offer</option>
          </select>
          <span className="text-xs text-gray-500">
            Bundles combine existing standard products into one merchandised offer with its own custom price.
          </span>
        </label>
        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span>Brand</span>
          <select className={selectClassName} {...form.register('brand')}>
            <option value="">No brand linked</option>
            {brandOptions.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}{!brand.isActive ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
          {form.formState.errors.brand?.message ? <span className="text-xs text-red-400">{form.formState.errors.brand.message}</span> : null}
          {!brandOptions.length ? <span className="text-xs text-amber-200">Create at least one brand in the Brands workspace to link products cleanly.</span> : null}
        </label>
        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span>Item Condition</span>
          <select className={selectClassName} {...form.register('condition')}>
            <option value="new">Brand new</option>
            <option value="used">Used item</option>
          </select>
          <span className="text-xs text-gray-500">
            Used items can be merchandised separately on the storefront and found with the new shop condition filter.
          </span>
        </label>
        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span>Category</span>
          <select className={selectClassName} {...form.register('category')}>
            <option value="">Select category</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {form.formState.errors.category?.message ? <span className="text-xs text-red-400">{form.formState.errors.category.message}</span> : null}
        </label>
        <Input label="Master SKU" placeholder="NJ-GALAXY-S24-ULTRA" {...form.register('sku')} error={form.formState.errors.sku?.message} />
      </div>
    </ProductFormSection>
    ) : null}

    {activeSection === 'pricing' ? (
    <ProductFormSection id="product-editor-pricing" title="Pricing & Shipping" description="Add the commercial values used by quotations, checkout, and order validation.">
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Price" type="number" placeholder="349900" {...form.register('price')} error={form.formState.errors.price?.message} />
        <Input label="Compare Price" type="number" placeholder="379900" {...form.register('comparePrice')} error={form.formState.errors.comparePrice?.message} />
        <Input label="Weight (grams)" type="number" placeholder="233" {...form.register('weight')} error={form.formState.errors.weight?.message} />
        <Input
          label="Loyalty Points"
          type="number"
          placeholder="3499"
          {...form.register('loyaltyPoints')}
          error={form.formState.errors.loyaltyPoints?.message}
        />
      </div>
      {watchedProductType === 'bundle' ? (
        <div className="mt-4 rounded-lg border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
          Bundle pricing is set here at the offer level. Inventory is derived automatically from the bundled items below.
        </div>
      ) : null}
    </ProductFormSection>
    ) : null}

    {activeSection === 'details' ? (
    <ProductFormSection id="product-editor-content" title="Descriptions" description="Short text is used on cards. The full description powers the detail page and SEO snippets.">
      <div className="space-y-4">
        <Textarea
          label="Short Description"
          placeholder="Compact premium smartphone with a high-resolution camera and AI features."
          {...form.register('shortDescription')}
          error={form.formState.errors.shortDescription?.message}
        />
        <Textarea
          label="Description"
          placeholder="Describe the product highlights, materials, use cases, and what makes it a strong fit for buyers."
          className="min-h-[180px]"
          {...form.register('description')}
          error={form.formState.errors.description?.message}
        />
        <Input label="Tags (comma separated)" placeholder="5G, flagship, AI camera, titanium" {...form.register('tags')} error={form.formState.errors.tags?.message} />
      </div>
    </ProductFormSection>
    ) : null}

    {activeSection === 'pricing' ? (
    <ProductFormSection id="product-editor-publishing" title="Publishing Controls" description="Decide how this product should appear across the storefront.">
      <div className="grid gap-4 md:grid-cols-4">
        <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-gray-300">
          <input className="mt-1 h-4 w-4 rounded border-white/20 bg-dark-light text-gold focus:ring-gold/30" type="checkbox" {...form.register('isFeatured')} />
          <span>
            <span className="block font-medium text-white">Featured</span>
            <span className="mt-1 block text-xs text-gray-400">Show this in curated hero or spotlight sections.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-gray-300">
          <input className="mt-1 h-4 w-4 rounded border-white/20 bg-dark-light text-gold focus:ring-gold/30" type="checkbox" {...form.register('isBestSeller')} />
          <span>
            <span className="block font-medium text-white">Best Seller</span>
            <span className="mt-1 block text-xs text-gray-400">Display stronger purchase-confidence cues.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-gray-300">
          <input className="mt-1 h-4 w-4 rounded border-white/20 bg-dark-light text-gold focus:ring-gold/30" type="checkbox" {...form.register('isFlashDeal')} />
          <span>
            <span className="block font-medium text-white">Flash Deal</span>
            <span className="mt-1 block text-xs text-gray-400">Makes the product eligible for the homepage flash-deals section and countdown timer.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-gray-300">
          <input className="mt-1 h-4 w-4 rounded border-white/20 bg-dark-light text-gold focus:ring-gold/30" type="checkbox" {...form.register('isActive')} />
          <span>
            <span className="block font-medium text-white">Active</span>
            <span className="mt-1 block text-xs text-gray-400">Make this product available on the storefront.</span>
          </span>
        </label>
      </div>
      {watchedIsFlashDeal ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DatePicker
            label="Flash Deal Ends At"
            mode="datetime-local"
            {...form.register('flashDealEndsAt')}
            error={form.formState.errors.flashDealEndsAt?.message}
          />
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Set a real end date so the storefront can show urgency and automatically cool down the banner when the deal expires.
          </div>
        </div>
      ) : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <DatePicker label="Publish At" mode="datetime-local" {...form.register('publishAt')} error={form.formState.errors.publishAt?.message} />
        <div className="rounded-lg border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
          Schedule a future publish time to keep the product hidden until that moment while still letting the team finish merchandising work now.
        </div>
      </div>
    </ProductFormSection>
    ) : null}

    {activeSection === 'bundle' && watchedProductType === 'bundle' ? (
      <ProductFormSection id="product-editor-bundle" title="Bundle Composition" description="Choose the standard products included in this bundle and how many of each unit ship together.">
        <div className="space-y-4">
          {bundleItemFields.map((field, index) => {
            const selectedProductId = watchedBundleItems?.[index]?.product ?? '';
            const selectedProduct = bundleCandidateProducts.find((product) => product._id === selectedProductId);

            return (
              <div key={field.id} className="rounded-lg border border-white/10 bg-white/5 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">Bundle Item {index + 1}</p>
                  <Button type="button" size="sm" variant="ghost" onClick={() => onRemoveBundleItemRow(index)}>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>

                <div className="mt-3.5 grid gap-4 md:grid-cols-3">
                  <label className="flex flex-col gap-2 text-sm text-gray-300">
                    <span>Product</span>
                    <select className={selectClassName} {...form.register(`bundleItems.${index}.product`)}>
                      <option value="">Select product</option>
                      {bundleCandidateProducts.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.name} ({product.sku}){!product.isActive ? ' - inactive' : ''}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.bundleItems?.[index]?.product?.message ? (
                      <span className="text-xs text-red-400">{form.formState.errors.bundleItems?.[index]?.product?.message}</span>
                    ) : null}
                  </label>
                  <Input
                    label="Quantity"
                    type="number"
                    placeholder="1"
                    {...form.register(`bundleItems.${index}.quantity`)}
                    error={form.formState.errors.bundleItems?.[index]?.quantity?.message}
                  />
                  <label className="flex flex-col gap-2 text-sm text-gray-300">
                    <span>Variant</span>
                    <select className={selectClassName} {...form.register(`bundleItems.${index}.variantIndex`)}>
                      <option value="">Auto / choose variant</option>
                      {(selectedProduct?.variants ?? []).map((variant, variantIndex) => (
                        <option key={`${field.id}-variant-${variantIndex}`} value={variantIndex}>
                          {variant.sku}
                          {[variant.color, variant.storage, variant.model].filter(Boolean).length
                            ? ` - ${[variant.color, variant.storage, variant.model].filter(Boolean).join(' / ')}`
                            : ''}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-500">
                      {selectedProduct
                        ? selectedProduct.variants.length > 1
                          ? 'Choose the exact variant included in the bundle.'
                          : 'Single-variant products are auto-resolved if you leave this blank.'
                        : 'Select a product first to choose a variant.'}
                    </span>
                  </label>
                </div>
              </div>
            );
          })}

          {typeof form.formState.errors.bundleItems?.message === 'string' ? <p className="text-xs text-red-400">{form.formState.errors.bundleItems.message}</p> : null}

          <Button type="button" variant="secondary" onClick={onAppendBundleItem}>
            <Plus className="h-4 w-4" />
            Add bundled product
          </Button>
        </div>
      </ProductFormSection>
    ) : null}

    {activeSection === 'specs' ? (
    <ProductFormSection id="product-editor-specs" title="Technical Specifications" description="Capture the headline specs you want to show on the product page and comparison tables.">
      <div className="space-y-4">
        {specificationFields.map((field, index) => (
          <div key={field.id} className="rounded-lg border border-white/10 bg-white/5 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">Specification {index + 1}</p>
              <Button type="button" size="sm" variant="ghost" onClick={() => onRemoveSpecificationRow(index)}>
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>

            <div className="mt-3.5 grid gap-4 md:grid-cols-[minmax(180px,0.42fr)_minmax(0,1fr)]">
              <Input label="Label" placeholder="Display" {...form.register(`specifications.${index}.key`)} error={form.formState.errors.specifications?.[index]?.key?.message} />
              <Input
                label="Value"
                placeholder='6.8" QHD+ Dynamic AMOLED 2X'
                {...form.register(`specifications.${index}.value`)}
                error={form.formState.errors.specifications?.[index]?.value?.message}
              />
            </div>
          </div>
        ))}

        {typeof form.formState.errors.specifications?.message === 'string' ? <p className="text-xs text-red-400">{form.formState.errors.specifications.message}</p> : null}

        <Button type="button" variant="secondary" onClick={onAppendSpecification}>
          <ListPlus className="h-4 w-4" />
          Add another specification
        </Button>
      </div>
    </ProductFormSection>
    ) : null}

    {activeSection === 'seo' ? (
    <ProductFormSection id="product-editor-seo" title="SEO & Content" description="Optional fields that improve search engine visibility and add extra content to the product page.">
      <div className="space-y-4">
        <Input
          label="SEO Title (max 60 chars)"
          placeholder="Samsung Galaxy S24 Ultra — Best Price in Sri Lanka | NJ Store"
          {...form.register('metaTitle')}
          error={form.formState.errors.metaTitle?.message}
        />
        <Textarea
          label="Meta Description (max 160 chars)"
          placeholder="Buy Samsung Galaxy S24 Ultra at the best price in Sri Lanka. Official warranty, fast delivery."
          {...form.register('metaDescription')}
          error={form.formState.errors.metaDescription?.message}
        />
        <Input
          label="Canonical URL"
          placeholder="https://njstore.lk/shop/samsung-galaxy-s24-ultra"
          {...form.register('canonicalUrl')}
          error={form.formState.errors.canonicalUrl?.message}
        />
        <Input
          label="Warranty"
          placeholder="1-year Samsung Sri Lanka warranty"
          {...form.register('warranty')}
          error={form.formState.errors.warranty?.message}
        />
        <Input
          label="Product Video URL"
          placeholder="https://www.youtube.com/watch?v=..."
          {...form.register('videoUrl')}
          error={form.formState.errors.videoUrl?.message}
        />
      </div>
    </ProductFormSection>
    ) : null}
  </div>
);
