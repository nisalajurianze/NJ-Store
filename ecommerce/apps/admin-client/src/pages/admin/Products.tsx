import { useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Download, Upload } from 'lucide-react';
import { Badge, Button } from '@njstore/ui';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { adminService } from '../../services/adminService';
import { AdminSearchBar } from '../../components/ui/AdminSearchBar';
import { AdminControlPanel, AdminInlineNotice, AdminPageHeader, AdminStatGrid, adminSelectFieldClassName } from '../../components/ui/AdminSurface';
import { getApiErrorMessage } from '../../utils/apiError';
import { ProductEditorModal } from './products/ProductEditorModal';
import { ProductListTable } from './products/ProductListTable';
import { ProductVersionHistoryModal } from './products/ProductVersionHistoryModal';
import { exportProductsCsv } from './products/productCsvExport';
import {
  buildDefaults,
  createEmptyBundleItem,
  createEmptyImage,
  createEmptySpecification,
  createEmptyVariant,
  flattenCategories,
  isBlankImageValue,
  parseNullableDateTime,
  parseOptionalDateTime,
  parseOptionalNumber,
  parsePositivePage,
  productPageSize,
  productSchema,
  resolveBundleProductId,
  resolveCategoryId,
  toFormImageValue,
  type BrandRecord,
  type CategoryNode,
  type ListQueryResult,
  type ProductFormValues,
  type ProductImageFormValue,
  type ProductRecord,
  type ProductVersionRecord
} from './products/productFormModel';
import { getVersionDiffEntries } from './products/productVersionDiff';

const selectClassName = adminSelectFieldClassName;

const isBlankVariantDraft = (variant?: ProductFormValues['variants'][number]): boolean =>
  !variant ||
  (!variant.sku.trim() &&
    !variant.color?.trim() &&
    !variant.colorCode?.trim() &&
    !variant.storage?.trim() &&
    !variant.model?.trim() &&
    !variant.glowColor?.trim() &&
    !variant.price?.trim() &&
    !variant.images?.length &&
    !variant.attributes?.some((attribute) => attribute.name?.trim() || attribute.value?.trim()));

const isBlankBundleItemDraft = (item?: ProductFormValues['bundleItems'][number]): boolean =>
  !item || (!item.product.trim() && (!item.quantity.trim() || item.quantity.trim() === '1') && !item.variantIndex?.trim());

export const Products = (): JSX.Element => {
  const { hasPermissions } = useAdminPermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categories = useQuery<ListQueryResult<CategoryNode>>({
    queryKey: ['admin', 'categories'],
    queryFn: async () => (await adminService.categories()) as ListQueryResult<CategoryNode>
  });
  const brands = useQuery<ListQueryResult<BrandRecord>>({
    queryKey: ['admin', 'brands', 'product-form'],
    queryFn: async () =>
      (await adminService.brands({
        includeInactive: true,
        sort: 'sortOrder',
        limit: 50
      })) as ListQueryResult<BrandRecord>
  });

  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [historyProduct, setHistoryProduct] = useState<ProductRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? '');
  const [showInactive, setShowInactive] = useState(() => searchParams.get('view') === 'all');
  const [productPage, setProductPage] = useState(() => parsePositivePage(searchParams.get('page')));
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productImagesInputRef = useRef<HTMLInputElement | null>(null);
  const variantImageInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [uploadingImageTarget, setUploadingImageTarget] = useState<string | null>(null);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const canWriteProducts = hasPermissions('product:write');
  const canDeleteProducts = hasPermissions('product:delete');
  const editProductId = searchParams.get('edit');
  const previousProductFiltersRef = useRef({ search: deferredSearchTerm, showInactive });

  const products = useQuery<ListQueryResult<ProductRecord>>({
    queryKey: ['admin', 'products', { page: productPage, search: deferredSearchTerm, includeInactive: showInactive }],
    queryFn: async () =>
      (await adminService.products<ProductRecord>({
        page: productPage,
        limit: productPageSize,
        search: deferredSearchTerm.trim() || undefined,
        includeInactive: showInactive
      })) as ListQueryResult<ProductRecord>
  });
  const editProductLookup = useQuery<ListQueryResult<ProductRecord>>({
    queryKey: ['admin', 'products', 'edit', editProductId],
    queryFn: async () =>
      (await adminService.products<ProductRecord>({
        ids: editProductId ? [editProductId] : [],
        includeInactive: true,
        limit: 1
      })) as ListQueryResult<ProductRecord>,
    enabled: Boolean(editProductId && canWriteProducts && !isModalOpen)
  });

  const productHistory = useQuery<ProductVersionRecord[]>({
    queryKey: ['admin', 'product-versions', historyProduct?._id],
    queryFn: async () => (await adminService.productVersions(historyProduct?._id ?? '')).data as ProductVersionRecord[],
    enabled: Boolean(historyProduct?._id)
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: buildDefaults()
  });

  const {
    fields: imageFields,
    append: appendImage,
    remove: removeImage,
    replace: replaceImages
  } = useFieldArray({
    control: form.control,
    name: 'images'
  });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
    replace: replaceVariants
  } = useFieldArray({
    control: form.control,
    name: 'variants'
  });

  const {
    fields: specificationFields,
    append: appendSpecification,
    remove: removeSpecification
  } = useFieldArray({
    control: form.control,
    name: 'specifications'
  });

  const {
    fields: bundleItemFields,
    append: appendBundleItem,
    remove: removeBundleItem,
    replace: replaceBundleItems
  } = useFieldArray({
    control: form.control,
    name: 'bundleItems'
  });

  const watchedProductType = form.watch('productType');
  const bundleCandidateCatalog = useQuery<ListQueryResult<ProductRecord>>({
    queryKey: ['admin', 'products', 'bundle-candidates'],
    queryFn: async () => (await adminService.products<ProductRecord>({ limit: 50 })) as ListQueryResult<ProductRecord>,
    enabled: canWriteProducts && isModalOpen && watchedProductType === 'bundle',
    staleTime: 60_000
  });
  const productItems = products.data?.data ?? [];
  const visibleProducts = useMemo(() => productItems.filter((product) => (showInactive ? true : product.isActive)), [productItems, showInactive]);
  const filteredProducts = useMemo(() => {
    const query = deferredSearchTerm.trim().toLowerCase();
    return visibleProducts.filter((product) => {
      if (!query) {
        return true;
      }

      const searchableText = [
        product.name,
        product.brand,
        product.category?.name ?? 'unassigned',
        product.sku,
        product.shortDescription,
        product.productType ?? 'standard',
        product.condition === 'used' ? 'used item' : 'brand new',
        product.isFeatured ? 'featured' : '',
        product.isBestSeller ? 'best seller' : '',
        product.isFlashDeal ? 'flash deal' : '',
        product.isActive ? 'active' : 'inactive',
        ...(product.tags ?? []),
        ...product.variants.flatMap((variant) => [variant.sku, variant.color ?? '', variant.storage ?? '', variant.model ?? ''])
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [deferredSearchTerm, visibleProducts]);
  const productPagination = products.data?.pagination;
  const productTotalCount = productPagination?.total ?? filteredProducts.length;
  const productTotalPages = productPagination?.totalPages ?? 1;
  const currentProductPage = productPagination?.page ?? productPage;
  const currentProductLimit = productPagination?.limit ?? productPageSize;
  const productPageStart = productTotalCount > 0 ? (currentProductPage - 1) * currentProductLimit + 1 : 0;
  const productPageEnd = productTotalCount > 0 ? Math.min(productPageStart + filteredProducts.length - 1, productTotalCount) : 0;
  const categoryOptions = flattenCategories(categories.data?.data ?? []);
  const brandOptions = useMemo(() => (brands.data?.data ?? []).slice().sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)), [brands.data?.data]);
  const watchedImages = form.watch('images');
  const watchedIsFlashDeal = form.watch('isFlashDeal');
  const watchedBundleItems = form.watch('bundleItems');
  const watchedVariants = form.watch('variants');
  const featuredCount = productItems.filter((product) => product.isFeatured).length;
  const flashDealCount = productItems.filter((product) => product.isFlashDeal).length;
  const usedProductCount = productItems.filter((product) => product.condition === 'used').length;
  const activeProductCount = productItems.filter((product) => product.isActive).length;
  const inactiveProductCount = productItems.filter((product) => !product.isActive).length;
  const scheduledProductCount = productItems.filter((product) => product.publishAt && new Date(product.publishAt).getTime() > Date.now()).length;
  const bundleCandidateSourceProducts = bundleCandidateCatalog.data?.data ?? productItems;
  const bundleCandidateProducts = useMemo(
    () => bundleCandidateSourceProducts.filter((product) => product.productType !== 'bundle' && (!editingProduct || product._id !== editingProduct._id)),
    [bundleCandidateSourceProducts, editingProduct]
  );
  const versionItems = productHistory.data ?? [];
  const selectedVersion = versionItems.find((version) => version.id === selectedVersionId) ?? versionItems[0];
  const comparisonVersion = selectedVersion ? versionItems.find((version) => version.version === selectedVersion.version - 1) : undefined;
  const versionDiffEntries = getVersionDiffEntries(selectedVersion?.snapshot, comparisonVersion?.snapshot);
  const diffBaselineUnavailable = Boolean(selectedVersion && selectedVersion.version > 1 && !comparisonVersion);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    if (watchedProductType === 'bundle' && bundleItemFields.length === 0) {
      appendBundleItem(createEmptyBundleItem(), { shouldFocus: false });
    }

    if (watchedProductType === 'bundle') {
      const currentVariants = form.getValues('variants');
      if (currentVariants.length > 0 && currentVariants.every(isBlankVariantDraft)) {
        replaceVariants([]);
      }
      return;
    }

    if (watchedProductType === 'standard' && variantFields.length === 0) {
      appendVariant(createEmptyVariant(), { shouldFocus: false });
    }

    const currentBundleItems = form.getValues('bundleItems');
    if (currentBundleItems.length > 0 && currentBundleItems.every(isBlankBundleItemDraft)) {
      replaceBundleItems([]);
    }
  }, [
    appendBundleItem,
    appendVariant,
    bundleItemFields.length,
    form,
    isModalOpen,
    replaceBundleItems,
    replaceVariants,
    variantFields.length,
    watchedProductType
  ]);

  useEffect(() => {
    const nextSearchTerm = searchParams.get('q') ?? '';
    const nextShowInactive = searchParams.get('view') === 'all';
    const nextProductPage = parsePositivePage(searchParams.get('page'));

    setSearchTerm((current) => (current === nextSearchTerm ? current : nextSearchTerm));
    setShowInactive((current) => (current === nextShowInactive ? current : nextShowInactive));
    setProductPage((current) => (current === nextProductPage ? current : nextProductPage));
  }, [searchParams]);

  useEffect(() => {
    const previousFilters = previousProductFiltersRef.current;
    if (
      previousFilters.search !== deferredSearchTerm ||
      previousFilters.showInactive !== showInactive
    ) {
      setProductPage(1);
      previousProductFiltersRef.current = { search: deferredSearchTerm, showInactive };
    }
  }, [deferredSearchTerm, showInactive]);

  useEffect(() => {
    if (!historyProduct) {
      return;
    }

    const nextProduct = productItems.find((product) => product._id === historyProduct._id);
    if (!nextProduct) {
      setHistoryProduct(null);
      setSelectedVersionId(null);
      return;
    }

    if (nextProduct !== historyProduct) {
      setHistoryProduct(nextProduct);
    }
  }, [historyProduct, productItems]);

  useEffect(() => {
    if (!versionItems.length) {
      setSelectedVersionId(null);
      return;
    }

    setSelectedVersionId((current) => (current && versionItems.some((version) => version.id === current) ? current : versionItems[0]!.id));
  }, [versionItems]);

  const openCreateModal = (): void => {
    if (!canWriteProducts) {
      return;
    }
    setEditingProduct(null);
    form.reset(buildDefaults());
    setIsModalOpen(true);
  };

  const openEditModal = (product: ProductRecord): void => {
    if (!canWriteProducts) {
      return;
    }
    setEditingProduct(product);
    form.reset(buildDefaults(product));
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!editProductId || isModalOpen) {
      return;
    }

    if (!canWriteProducts) {
      return;
    }

    const productToEdit = productItems.find((product) => product._id === editProductId) ?? editProductLookup.data?.data?.[0];

    if (!productToEdit && editProductLookup.isPending) {
      return;
    }

    if (productToEdit && canWriteProducts) {
      setEditingProduct(productToEdit);
      form.reset(buildDefaults(productToEdit));
      setIsModalOpen(true);
      return;
    }

    if (!productToEdit && !editProductLookup.isPending) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('edit');
      void setSearchParams(nextParams, { replace: true });
    }
  }, [canWriteProducts, editProductId, editProductLookup.data?.data, editProductLookup.isPending, form, isModalOpen, productItems, searchParams, setSearchParams]);

  const closeModal = (): void => {
    setEditingProduct(null);
    setIsModalOpen(false);
    form.reset(buildDefaults());

    if (searchParams.has('edit')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('edit');
      void setSearchParams(nextParams, { replace: true });
    }
  };

  const closeHistoryModal = (): void => {
    setHistoryProduct(null);
    setSelectedVersionId(null);
  };

  const openHistoryModal = (product: ProductRecord): void => {
    setHistoryProduct(product);
    setSelectedVersionId(null);
  };

  const handleDeactivateProduct = async (product: ProductRecord): Promise<void> => {
    if (!window.confirm(`Deactivate "${product.name}"? It will disappear from the active list but can still be restored.`)) {
      return;
    }

    try {
      await adminService.deleteProduct(product._id);
      setShowInactive(true);
      toast.success('Product deactivated. Inactive items are now visible.');
      await products.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to deactivate this product right now.'));
    }
  };

  const handleRestoreProduct = async (product: ProductRecord): Promise<void> => {
    try {
      await adminService.updateProduct(product._id, { isActive: true });
      toast.success('Product restored');
      await products.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to restore this product right now.'));
    }
  };

  const handleDeleteProduct = async (product: ProductRecord): Promise<void> => {
    if (
      !window.confirm(
        `Permanently delete "${product.name}"? This cannot be undone. If the product is linked to orders or reviews, deletion will be blocked.`
      )
    ) {
      return;
    }

    try {
      await adminService.permanentlyDeleteProduct(product._id);
      toast.success('Product deleted permanently');
      await products.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to permanently delete this product.'));
    }
  };

  const handleDuplicateProduct = async (product: ProductRecord): Promise<void> => {
    if (!canWriteProducts) return;
    const newSku = `${product.sku}-COPY-${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      name: `${product.name} (Copy)`,
      productType: product.productType ?? 'standard',
      brand: product.brandId ?? undefined,
      category: resolveCategoryId(product),
      price: product.price,
      comparePrice: product.comparePrice,
      shortDescription: product.shortDescription,
      description: product.description,
      sku: newSku,
      weight: product.weight,
      loyaltyPoints: product.loyaltyPoints ?? 0,
      tags: product.tags,
      isBestSeller: false,
      isFeatured: false,
      isFlashDeal: false,
      flashDealEndsAt: undefined,
      condition: product.condition ?? 'new',
      isActive: false, // start inactive so admin can review before publishing
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      canonicalUrl: undefined,
      publishAt: undefined,
      warranty: product.warranty,
      videoUrl: product.videoUrl,
      images: product.images,
      variants:
        product.productType === 'bundle'
          ? []
          : product.variants.map((variant) => ({ ...variant, sku: `${variant.sku}-COPY` })),
      bundleItems:
        product.productType === 'bundle'
          ? (product.bundleItems ?? []).map((bundleItem) => ({
              product: resolveBundleProductId(bundleItem.product),
              quantity: bundleItem.quantity,
              variantIndex: bundleItem.variantIndex
            }))
          : [],
      specifications: product.specifications
    };
    try {
      await adminService.createProduct(payload);
      toast.success(`Duplicated as "${payload.name}" (inactive)`);
      setShowInactive(true);
      await products.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to duplicate this product right now.'));
    }
  };

  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const res = await adminService.importProductsCsv(file);
      if (res?.data?.failed > 0) {
        toast.error(`Imported ${res.data.success} products. ${res.data.failed} failed.`);
      } else {
        toast.success(`Successfully imported ${res?.data?.success ?? 0} products`);
      }
      void products.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'CSV Import failed'));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRestoreVersion = async (): Promise<void> => {
    if (!historyProduct || !selectedVersion) {
      return;
    }

    if (!window.confirm(`Restore "${historyProduct.name}" to version ${selectedVersion.version}? The current live state will be saved as a newer version.`)) {
      return;
    }

    try {
      setIsRestoringVersion(true);
      await adminService.restoreProductVersion(historyProduct._id, selectedVersion.id);
      toast.success(`Restored ${historyProduct.name} to version ${selectedVersion.version}`);
      await Promise.all([products.refetch(), productHistory.refetch()]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to restore this product version right now.'));
    } finally {
      setIsRestoringVersion(false);
    }
  };

  const removeImageRow = (index: number): void => {
    if (imageFields.length === 1) {
      form.setValue(`images.${index}`, createEmptyImage(), { shouldDirty: true });
      return;
    }
    removeImage(index);
  };

  const uploadProductImageAssets = async (
    files: FileList | null,
    target: string
  ): Promise<ProductImageFormValue[]> => {
    const selectedFiles = Array.from(files ?? []);
    if (!selectedFiles.length) {
      return [];
    }

    try {
      setUploadingImageTarget(target);
      const uploaded = await adminService.uploadProductImages(selectedFiles);
      toast.success(`Uploaded ${uploaded.data.length} image${uploaded.data.length === 1 ? '' : 's'}`);
      return uploaded.data.map((image) => toFormImageValue(image));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to upload product images right now.'));
      return [];
    } finally {
      setUploadingImageTarget(null);
    }
  };

  const handleUploadMainImages = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const uploadedImages = await uploadProductImageAssets(event.target.files, 'product-images');
    if (uploadedImages.length) {
      const currentImages = form.getValues('images');
      const nextImages =
        currentImages.length === 1 && isBlankImageValue(currentImages[0]) ? uploadedImages : [...currentImages, ...uploadedImages];

      replaceImages(nextImages);
    }

    if (productImagesInputRef.current) {
      productImagesInputRef.current.value = '';
    }
  };

  const addVariantImageRow = (variantIndex: number): void => {
    const fieldPath = `variants.${variantIndex}.images` as const;
    const currentImages = form.getValues(fieldPath) ?? [];
    form.setValue(fieldPath, [...currentImages, createEmptyImage()], { shouldDirty: true, shouldValidate: true });
  };

  const removeVariantImageRow = (variantIndex: number, imageIndex: number): void => {
    const fieldPath = `variants.${variantIndex}.images` as const;
    const currentImages = form.getValues(fieldPath) ?? [];
    form.setValue(
      fieldPath,
      currentImages.filter((_, currentIndex) => currentIndex !== imageIndex),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const handleUploadVariantImages = (variantIndex: number) => async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const uploadedImages = await uploadProductImageAssets(event.target.files, `variant-images-${variantIndex}`);
    if (uploadedImages.length) {
      const fieldPath = `variants.${variantIndex}.images` as const;
      const currentImages = form.getValues(fieldPath) ?? [];
      const nextImages =
        currentImages.length === 1 && isBlankImageValue(currentImages[0]) ? uploadedImages : [...currentImages, ...uploadedImages];

      form.setValue(fieldPath, nextImages, { shouldDirty: true, shouldValidate: true });
    }

    const variantInput = variantImageInputRefs.current[variantIndex];
    if (variantInput) {
      variantInput.value = '';
    }
  };

  const removeVariantRow = (index: number): void => {
    if (variantFields.length === 1) {
      form.setValue(`variants.${index}`, createEmptyVariant(), { shouldDirty: true });
      return;
    }
    removeVariant(index);
  };

  const removeSpecificationRow = (index: number): void => {
    if (specificationFields.length === 1) {
      form.setValue(`specifications.${index}`, createEmptySpecification(), { shouldDirty: true });
      return;
    }
    removeSpecification(index);
  };

  const removeBundleItemRow = (index: number): void => {
    if (bundleItemFields.length === 1) {
      form.setValue(`bundleItems.${index}`, createEmptyBundleItem(), { shouldDirty: true });
      return;
    }
    removeBundleItem(index);
  };

  const saveProduct = async (values: ProductFormValues): Promise<void> => {
    try {
      const normalizedBundleItems =
        values.productType === 'bundle'
          ? values.bundleItems
              .filter((bundleItem) => bundleItem.product.trim())
              .map((bundleItem) => ({
                product: bundleItem.product.trim(),
                quantity: Number(bundleItem.quantity),
                variantIndex: bundleItem.variantIndex?.trim() ? Number(bundleItem.variantIndex) : undefined
              }))
          : [];

      const sharedPayload = {
        name: values.name,
        productType: values.productType,
        brand: values.brand?.trim() ? values.brand.trim() : null,
        condition: values.condition,
        category: values.category,
        price: Number(values.price),
        shortDescription: values.shortDescription,
        description: values.description,
        sku: values.sku,
        loyaltyPoints: Number(values.loyaltyPoints),
        tags: values.tags
          ?.split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        images: values.images.map((image) => ({
          url: image.url.trim(),
          publicId: image.publicId.trim(),
          alt: image.alt?.trim() || undefined
        })),
        variants:
          values.productType === 'bundle'
            ? []
            : values.variants.map((variant) => ({
                color: variant.color?.trim() || undefined,
                colorCode: variant.colorCode?.trim() || undefined,
                storage: variant.storage?.trim() || undefined,
                model: variant.model?.trim() || undefined,
                attributes: (variant.attributes ?? [])
                  .map((attribute) => ({
                    name: attribute.name?.trim() ?? '',
                    value: attribute.value?.trim() ?? ''
                  }))
                  .filter((attribute) => attribute.name && attribute.value),
                glowColor: variant.glowColor?.trim() || undefined,
                images: (variant.images ?? []).map((image) => ({
                  url: image.url.trim(),
                  publicId: image.publicId.trim(),
                  alt: image.alt?.trim() || undefined
                })),
                price: parseOptionalNumber(variant.price),
                stock: Number(variant.stock),
                sku: variant.sku.trim()
              })),
        bundleItems: normalizedBundleItems,
        specifications: values.specifications.map((specification) => ({
          key: specification.key.trim(),
          value: specification.value.trim()
        })),
        isBestSeller: values.isBestSeller,
        isFeatured: values.isFeatured,
        isFlashDeal: values.isFlashDeal,
        isActive: values.isActive
      };

      if (editingProduct) {
        await adminService.updateProduct(editingProduct._id, {
          ...sharedPayload,
          comparePrice: parseOptionalNumber(values.comparePrice) ?? null,
          weight: parseOptionalNumber(values.weight) ?? null,
          flashDealEndsAt: values.isFlashDeal ? parseNullableDateTime(values.flashDealEndsAt) : null,
          publishAt: parseNullableDateTime(values.publishAt),
          metaTitle: values.metaTitle?.trim() || null,
          metaDescription: values.metaDescription?.trim() || null,
          canonicalUrl: values.canonicalUrl?.trim() || null,
          warranty: values.warranty?.trim() || null,
          videoUrl: values.videoUrl?.trim() || null
        });
        toast.success('Product updated');
      } else {
        await adminService.createProduct({
          ...sharedPayload,
          comparePrice: parseOptionalNumber(values.comparePrice),
          weight: parseOptionalNumber(values.weight),
          flashDealEndsAt: values.isFlashDeal ? parseOptionalDateTime(values.flashDealEndsAt) : undefined,
          publishAt: parseOptionalDateTime(values.publishAt),
          metaTitle: values.metaTitle?.trim() || undefined,
          metaDescription: values.metaDescription?.trim() || undefined,
          canonicalUrl: values.canonicalUrl?.trim() || undefined,
          warranty: values.warranty?.trim() || undefined,
          videoUrl: values.videoUrl?.trim() || undefined
        });
        toast.success('Product created');
      }

      closeModal();
      await products.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to save this product right now.'));
    }
  };

  const handleProductSubmit = form.handleSubmit(saveProduct, () => {
    toast.error('Please fix the highlighted product fields before saving.');
  });

  const handleCsvExport = async (): Promise<void> => {
    try {
      setIsExportingCsv(true);
      await exportProductsCsv(filteredProducts);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to export products right now.'));
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <div className="space-y-3 pb-2">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Products"
        description="Catalog records, pricing, variants, and feature flags with create and edit controls backed by the live API."
        action={
          canWriteProducts ? (
            <Button onClick={openCreateModal}>Add Product</Button>
          ) : (
            <Badge variant="default" className="bg-white/[0.06] text-gray-300">
              Read Only
            </Badge>
          )
        }
      />

      <AdminStatGrid
        className="2xl:grid-cols-7"
        items={[
          {
            label: 'Matching products',
            value: productTotalCount.toLocaleString(),
            support: 'Total products matching the current server-side filters.',
            tone: 'slate'
          },
          {
            label: 'Active products',
            value: activeProductCount.toLocaleString(),
            support: 'Records still visible on the live storefront.',
            tone: 'emerald'
          },
          {
            label: 'Scheduled',
            value: scheduledProductCount.toLocaleString(),
            support: scheduledProductCount > 0 ? 'These products are queued for future publication.' : 'No products are waiting on a publish time.',
            tone: scheduledProductCount > 0 ? 'blue' : 'slate'
          },
          {
            label: 'Featured',
            value: featuredCount.toLocaleString(),
            support: 'Products currently highlighted in merchandising.',
            tone: 'gold'
          },
          {
            label: 'Flash deals',
            value: flashDealCount.toLocaleString(),
            support: 'Products currently eligible for the limited-time deals section.',
            tone: flashDealCount > 0 ? 'blue' : 'slate'
          },
          {
            label: 'Used items',
            value: usedProductCount.toLocaleString(),
            support: usedProductCount > 0 ? 'Pre-owned products are live in the catalog.' : 'All current products are marked as brand new.',
            tone: usedProductCount > 0 ? 'gold' : 'slate'
          },
          {
            label: 'Inactive',
            value: inactiveProductCount.toLocaleString(),
            support: inactiveProductCount > 0 ? 'Restore retired products from Inventory.' : 'No inactive records on this page.',
            tone: inactiveProductCount > 0 ? 'blue' : 'slate',
            onClick: () => navigate('/dashboard/inventory?filter=inactive')
          }
        ]}
      />

      <AdminControlPanel>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(220px,0.22fr)]">
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search products by name, brand, category, SKU, tag, or status"
            label="Search products"
            resultCount={filteredProducts.length}
            totalCount={productTotalCount}
          />
          <div className="flex items-stretch">
            <Button type="button" variant="secondary" className="w-full justify-center" onClick={() => setShowInactive((value) => !value)}>
              {showInactive ? 'Hide Inactive' : 'Show Inactive'}
            </Button>
          </div>
        </div>
        <AdminInlineNotice>
          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-300">
            {showInactive ? 'Full catalog view' : 'Active catalog view'}
          </span>
          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-300">
            Inventory moved
          </span>
          <p>
            {productTotalCount} product{productTotalCount === 1 ? '' : 's'} match the current search and visibility filters. Stock changes now live in the Inventory workspace. Showing {productPageStart}-{productPageEnd}.
          </p>
        </AdminInlineNotice>
      </AdminControlPanel>

      {/* CSV controls */}
      {canWriteProducts && filteredProducts.length > 0 ? (
        <div className="flex justify-end gap-3">
          <input
            type="file"
            accept=".csv, application/vnd.ms-excel, text/csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleCsvImport}
            disabled={isImporting}
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} isLoading={isImporting}>
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              void handleCsvExport();
            }}
            disabled={isImporting}
            isLoading={isExportingCsv}
            loadingLabel="Exporting..."
          >
            <Download className="h-4 w-4" />
            Export Page CSV ({filteredProducts.length})
          </Button>
        </div>
      ) : null}

      <ProductListTable
        filteredProducts={filteredProducts}
        canWriteProducts={canWriteProducts}
        canDeleteProducts={canDeleteProducts}
        onOpenEditModal={openEditModal}
        onDuplicateProduct={(product) => void handleDuplicateProduct(product)}
        onOpenHistoryModal={openHistoryModal}
        onDeactivateProduct={(product) => void handleDeactivateProduct(product)}
        onRestoreProduct={(product) => void handleRestoreProduct(product)}
        onDeleteProduct={(product) => void handleDeleteProduct(product)}
      />

      {productTotalPages > 1 ? (
        <div className="flex flex-col gap-3 rounded-[18px] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-gray-300 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Page {currentProductPage} of {productTotalPages} · {productPageStart}-{productPageEnd} of {productTotalCount}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={currentProductPage <= 1 || products.isFetching}
              onClick={() => setProductPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={currentProductPage >= productTotalPages || products.isFetching}
              onClick={() => setProductPage((page) => Math.min(productTotalPages, page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <ProductEditorModal
        isOpen={isModalOpen}
        editingProduct={editingProduct}
        form={form}
        canWriteProducts={canWriteProducts}
        selectClassName={selectClassName}
        categoryOptions={categoryOptions}
        brandOptions={brandOptions}
        bundleCandidateProducts={bundleCandidateProducts}
        imageFields={imageFields}
        variantFields={variantFields}
        specificationFields={specificationFields}
        bundleItemFields={bundleItemFields}
        watchedProductType={watchedProductType}
        watchedImages={watchedImages}
        watchedIsFlashDeal={watchedIsFlashDeal}
        watchedBundleItems={watchedBundleItems}
        watchedVariants={watchedVariants}
        productImagesInputRef={productImagesInputRef}
        variantImageInputRefs={variantImageInputRefs}
        uploadingImageTarget={uploadingImageTarget}
        onClose={closeModal}
        onSubmit={handleProductSubmit}
        onUploadMainImages={handleUploadMainImages}
        onAppendImage={() => appendImage(createEmptyImage())}
        onRemoveImageRow={removeImageRow}
        onAppendVariant={() => appendVariant(createEmptyVariant())}
        onRemoveVariantRow={removeVariantRow}
        onAddVariantImageRow={addVariantImageRow}
        onRemoveVariantImageRow={removeVariantImageRow}
        onUploadVariantImages={handleUploadVariantImages}
        onAppendBundleItem={() => appendBundleItem(createEmptyBundleItem())}
        onRemoveBundleItemRow={removeBundleItemRow}
        onAppendSpecification={() => appendSpecification(createEmptySpecification())}
        onRemoveSpecificationRow={removeSpecificationRow}
      />

      <ProductVersionHistoryModal
        historyProduct={historyProduct}
        isLoading={productHistory.isLoading}
        versionItems={versionItems}
        selectedVersionId={selectedVersionId}
        selectedVersion={selectedVersion}
        diffBaselineUnavailable={diffBaselineUnavailable}
        versionDiffEntries={versionDiffEntries}
        canWriteProducts={canWriteProducts}
        isRestoringVersion={isRestoringVersion}
        onClose={closeHistoryModal}
        onSelectVersion={setSelectedVersionId}
        onRestoreVersion={() => void handleRestoreVersion()}
      />
    </div>
  );
};
