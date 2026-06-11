import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEventHandler,
  type MutableRefObject
} from 'react';
import type { UseFormReturn } from 'react-hook-form';
import {
  BadgeDollarSign,
  Boxes,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Image,
  type LucideIcon,
  ListChecks,
  Package,
  Save,
  X
} from 'lucide-react';
import { Button, Modal } from '@njstore/ui';
import type {
  BrandRecord,
  ProductEditorSection,
  ProductFormValues,
  ProductImageFormValue,
  ProductRecord
} from './productFormModel';
import { ProductForm } from './ProductForm';
import { ProductImageUploader } from './ProductImageUploader';
import { VariantEditor } from './VariantEditor';

interface ProductEditorField {
  id: string;
}

interface ProductEditorModalProps {
  isOpen: boolean;
  editingProduct: ProductRecord | null;
  form: UseFormReturn<ProductFormValues>;
  canWriteProducts: boolean;
  selectClassName: string;
  categoryOptions: Array<{ id: string; name: string }>;
  brandOptions: BrandRecord[];
  bundleCandidateProducts: ProductRecord[];
  imageFields: ProductEditorField[];
  variantFields: ProductEditorField[];
  specificationFields: ProductEditorField[];
  bundleItemFields: ProductEditorField[];
  watchedProductType: ProductFormValues['productType'];
  watchedImages: ProductImageFormValue[];
  watchedIsFlashDeal: boolean;
  watchedBundleItems: ProductFormValues['bundleItems'];
  watchedVariants: ProductFormValues['variants'];
  productImagesInputRef: MutableRefObject<HTMLInputElement | null>;
  variantImageInputRefs: MutableRefObject<Record<number, HTMLInputElement | null>>;
  uploadingImageTarget: string | null;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onUploadMainImages: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onAppendImage: () => void;
  onRemoveImageRow: (index: number) => void;
  onAppendVariant: () => void;
  onRemoveVariantRow: (index: number) => void;
  onAddVariantImageRow: (variantIndex: number) => void;
  onRemoveVariantImageRow: (variantIndex: number, imageIndex: number) => void;
  onUploadVariantImages: (variantIndex: number) => (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onAppendBundleItem: () => void;
  onRemoveBundleItemRow: (index: number) => void;
  onAppendSpecification: () => void;
  onRemoveSpecificationRow: (index: number) => void;
}

export const ProductEditorModal = ({
  isOpen,
  editingProduct,
  form,
  canWriteProducts,
  selectClassName,
  categoryOptions,
  brandOptions,
  bundleCandidateProducts,
  imageFields,
  variantFields,
  specificationFields,
  bundleItemFields,
  watchedProductType,
  watchedImages,
  watchedIsFlashDeal,
  watchedBundleItems,
  watchedVariants,
  productImagesInputRef,
  variantImageInputRefs,
  uploadingImageTarget,
  onClose,
  onSubmit,
  onUploadMainImages,
  onAppendImage,
  onRemoveImageRow,
  onAppendVariant,
  onRemoveVariantRow,
  onAddVariantImageRow,
  onRemoveVariantImageRow,
  onUploadVariantImages,
  onAppendBundleItem,
  onRemoveBundleItemRow,
  onAppendSpecification,
  onRemoveSpecificationRow
}: ProductEditorModalProps): JSX.Element => {
  const [activeSection, setActiveSection] = useState<ProductEditorSection>('details');
  const sectionLinks: Array<{
    id: ProductEditorSection;
    label: string;
    meta: string;
    Icon: LucideIcon;
  }> = [
    { id: 'details', label: 'Details', meta: 'Basics', Icon: Package },
    { id: 'pricing', label: 'Pricing', meta: 'Price & status', Icon: BadgeDollarSign },
    { id: 'images', label: 'Images', meta: `${imageFields.length} image${imageFields.length === 1 ? '' : 's'}`, Icon: Image },
    {
      id: watchedProductType === 'bundle' ? 'bundle' : 'variants',
      label: watchedProductType === 'bundle' ? 'Bundle' : 'Variants',
      meta: watchedProductType === 'bundle' ? `${bundleItemFields.length} item${bundleItemFields.length === 1 ? '' : 's'}` : `${variantFields.length} variant${variantFields.length === 1 ? '' : 's'}`,
      Icon: Boxes
    },
    { id: 'specs', label: 'Specs', meta: `${specificationFields.length} row${specificationFields.length === 1 ? '' : 's'}`, Icon: ListChecks },
    { id: 'seo', label: 'SEO', meta: 'Optional', Icon: FileSearch }
  ];
  const activeSectionIndex = Math.max(0, sectionLinks.findIndex((section) => section.id === activeSection));
  const activeSectionLabel = sectionLinks[activeSectionIndex]?.label ?? 'Details';
  const isFirstSection = activeSectionIndex <= 0;
  const isLastSection = activeSectionIndex >= sectionLinks.length - 1;

  useEffect(() => {
    if (isOpen) {
      setActiveSection('details');
    }
  }, [editingProduct?._id, isOpen]);

  useEffect(() => {
    if (watchedProductType === 'bundle' && activeSection === 'variants') {
      setActiveSection('bundle');
    }

    if (watchedProductType === 'standard' && activeSection === 'bundle') {
      setActiveSection('variants');
    }
  }, [activeSection, watchedProductType]);

  const goToPreviousSection = (): void => {
    const previousSection = sectionLinks[Math.max(0, activeSectionIndex - 1)];
    if (previousSection) {
      setActiveSection(previousSection.id);
    }
  };

  const goToNextSection = (): void => {
    const nextSection = sectionLinks[Math.min(sectionLinks.length - 1, activeSectionIndex + 1)];
    if (nextSection) {
      setActiveSection(nextSection.id);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={editingProduct ? 'Edit Product' : 'Create Product'}
      onClose={onClose}
      size="full"
      bodyClassName="p-0"
      contentClassName="max-w-[min(1180px,calc(100vw-1rem))]"
      showHeader={false}
    >
      <form className="flex min-h-0 flex-col" onSubmit={onSubmit}>
        <div className="border-b border-white/10 bg-[#080d16] px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold leading-tight text-white sm:text-2xl">
                  {editingProduct ? 'Edit Product' : 'Create Product'}
                </h2>
                <span className="rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs text-gray-300">
                  {watchedProductType === 'bundle' ? 'Bundle' : 'Standard'}
                </span>
                <span className="rounded-md border border-gold/20 bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold">
                  Step {activeSectionIndex + 1} of {sectionLinks.length}: {activeSectionLabel}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {canWriteProducts ? (
                <Button type="submit" isLoading={form.formState.isSubmitting}>
                  <Save className="h-4 w-4" />
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </Button>
              ) : null}
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close editor">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 bg-[#060b12] px-4 py-3 sm:px-5">
          <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6" aria-label="Product editor sections">
            {sectionLinks.map((section) => (
              <button
                key={section.id}
                type="button"
                aria-current={activeSection === section.id ? 'step' : undefined}
                onClick={() => setActiveSection(section.id)}
                className={`flex min-h-14 items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${
                  activeSection === section.id
                    ? 'border-gold/45 bg-gold/10 text-white'
                    : 'border-white/10 bg-white/[0.035] text-gray-300 hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${activeSection === section.id ? 'border-gold/30 bg-gold/10 text-gold' : 'border-white/10 bg-black/15 text-gray-400'}`}>
                  <section.Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{section.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-gray-500">{section.meta}</span>
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="min-h-[520px] bg-[#050914] px-4 py-4 sm:px-5 sm:py-5">
          <div className="mx-auto max-w-5xl">
            {activeSection !== 'images' && activeSection !== 'variants' ? (
            <ProductForm
              form={form}
              activeSection={activeSection}
              selectClassName={selectClassName}
              categoryOptions={categoryOptions}
              brandOptions={brandOptions}
              bundleCandidateProducts={bundleCandidateProducts}
              bundleItemFields={bundleItemFields}
              specificationFields={specificationFields}
              watchedProductType={watchedProductType}
              watchedIsFlashDeal={watchedIsFlashDeal}
              watchedBundleItems={watchedBundleItems}
              onAppendBundleItem={onAppendBundleItem}
              onRemoveBundleItemRow={onRemoveBundleItemRow}
              onAppendSpecification={onAppendSpecification}
              onRemoveSpecificationRow={onRemoveSpecificationRow}
            />
            ) : null}

            {activeSection === 'images' ? (
            <ProductImageUploader
              form={form}
              imageFields={imageFields}
              watchedImages={watchedImages}
              productImagesInputRef={productImagesInputRef}
              uploadingImageTarget={uploadingImageTarget}
              onUploadMainImages={onUploadMainImages}
              onAppendImage={onAppendImage}
              onRemoveImageRow={onRemoveImageRow}
            />
            ) : null}

            {activeSection === 'variants' && watchedProductType === 'standard' ? (
              <VariantEditor
                form={form}
                variantFields={variantFields}
                watchedVariants={watchedVariants}
                variantImageInputRefs={variantImageInputRefs}
                uploadingImageTarget={uploadingImageTarget}
                onAppendVariant={onAppendVariant}
                onRemoveVariantRow={onRemoveVariantRow}
                onAddVariantImageRow={onAddVariantImageRow}
                onRemoveVariantImageRow={onRemoveVariantImageRow}
                onUploadVariantImages={onUploadVariantImages}
              />
            ) : null}
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#080d16] px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="secondary" onClick={goToPreviousSection} disabled={isFirstSection}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <span className="text-xs text-gray-500">
              {activeSectionIndex + 1}/{sectionLinks.length}
            </span>
            <Button type="button" variant="secondary" onClick={goToNextSection} disabled={isLastSection}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
