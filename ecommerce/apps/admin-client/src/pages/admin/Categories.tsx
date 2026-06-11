import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { GripVertical, ImagePlus, Upload } from 'lucide-react';
import { Badge, Button, Input, Modal, Textarea } from '@njstore/ui';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { adminService } from '../../services/adminService';
import { AdminDataGrid } from '../../components/ui/AdminDataGrid';
import { AdminSearchBar } from '../../components/ui/AdminSearchBar';
import { AdminControlPanel, AdminInlineNotice, AdminPageHeader, AdminStatGrid, adminFormFieldClassName } from '../../components/ui/AdminSurface';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  buildDefaults,
  buildImagePayload,
  categoriesTableGridClass,
  categorySchema,
  flattenCategoryTree,
  reorderSiblingRows,
  sortCategoryTree,
  type CategoryFormValues,
  type CategoryRecord,
  type CategoryTreeRow,
  type DragPlacement
} from './categoriesModel';

const ADMIN_REFERENCE_STALE_TIME_MS = 5 * 60_000;

export const Categories = (): JSX.Element => {
  const { hasPermissions } = useAdminPermissions();
  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminService.categories(),
    staleTime: ADMIN_REFERENCE_STALE_TIME_MS
  });
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [dropTargetCategoryId, setDropTargetCategoryId] = useState<string | null>(null);
  const [dropPlacement, setDropPlacement] = useState<DragPlacement | null>(null);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const dragStateRef = useRef<{ draggedCategoryId: string | null; dropTargetCategoryId: string | null; dropPlacement: DragPlacement | null }>({
    draggedCategoryId: null,
    dropTargetCategoryId: null,
    dropPlacement: null
  });
  const canWriteCategories = hasPermissions('category:write');
  const canDeleteCategories = hasPermissions('category:delete');
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: buildDefaults()
  });

  const categoryTree = useMemo(() => sortCategoryTree((categories.data?.data ?? []) as CategoryRecord[]), [categories.data?.data]);
  const categoryRows = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);
  const activeCategories = categoryRows.filter((category) => category.isActive);
  const inactiveCategories = categoryRows.filter((category) => !category.isActive);
  const subcategoryCount = categoryRows.filter((category) => category.parent).length;
  const mappedProductsCount = categoryRows.reduce((sum, category) => sum + (category.productCount ?? 0), 0);
  const seoReadyCount = categoryRows.filter((category) => category.metaTitle || category.metaDescription).length;
  const watchedImageUrl = form.watch('imageUrl');
  const watchedImageAlt = form.watch('imageAlt');
  const visibleCategories = useMemo(() => categoryRows.filter((category) => (showInactive ? true : category.isActive)), [categoryRows, showInactive]);
  const filteredCategories = useMemo(() => {
    const query = deferredSearchTerm.trim().toLowerCase();
    if (!query) {
      return visibleCategories;
    }

    return visibleCategories.filter((category) => {
      return [category.name, category.slug, category.description ?? '', category.parentName, category.pathLabel ?? '', category.metaTitle ?? '', category.metaDescription ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [deferredSearchTerm, visibleCategories]);
  const parentOptions = useMemo(
    () =>
      categoryRows.filter(
        (category) => category.id !== editingCategory?.id && !category.ancestorIds.includes(editingCategory?.id ?? '__no-category__')
      ),
    [categoryRows, editingCategory?.id]
  );
  const draggedCategory = draggedCategoryId ? categoryRows.find((category) => category.id === draggedCategoryId) ?? null : null;

  const persistSiblingOrder = async (orderedSiblings: CategoryTreeRow[]): Promise<void> => {
    await Promise.all(
      orderedSiblings.map((category, index) =>
        adminService.updateCategory(category.id, {
          order: index
        })
      )
    );
  };

  const resetDragState = (): void => {
    dragStateRef.current = {
      draggedCategoryId: null,
      dropTargetCategoryId: null,
      dropPlacement: null
    };
    setDraggedCategoryId(null);
    setDropTargetCategoryId(null);
    setDropPlacement(null);
  };

  const openCreateModal = (): void => {
    if (!canWriteCategories) {
      return;
    }
    setEditingCategory(null);
    form.reset(buildDefaults());
    setIsModalOpen(true);
  };

  const openEditModal = (category: CategoryRecord): void => {
    if (!canWriteCategories) {
      return;
    }
    setEditingCategory(category);
    form.reset(buildDefaults(category));
    setIsModalOpen(true);
  };

  const closeModal = (): void => {
    setEditingCategory(null);
    setIsModalOpen(false);
    form.reset(buildDefaults());
  };

  const handleUploadImage = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsUploadingImage(true);
      const uploaded = await adminService.uploadCategoryImage(file, form.getValues('imageAlt'));
      form.setValue('imageUrl', uploaded.data.url, { shouldDirty: true, shouldValidate: true });
      form.setValue('imagePublicId', uploaded.data.publicId, { shouldDirty: true });
      form.setValue('imageAlt', uploaded.data.alt ?? file.name, { shouldDirty: true });
      toast.success('Category image uploaded');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to upload this category image right now.'));
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const moveCategory = async (categoryId: string, direction: 'up' | 'down'): Promise<void> => {
    if (!canWriteCategories) {
      return;
    }

    const currentCategory = categoryRows.find((entry) => entry.id === categoryId);
    if (!currentCategory) {
      return;
    }

    const siblings = categoryRows.filter((item) => item.parent === currentCategory.parent);
    const currentIndex = siblings.findIndex((item) => item.id === categoryId);
    if (currentIndex < 0 || siblings.length <= 1) {
      return;
    }

    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= siblings.length) {
      return;
    }

    const reorderedSiblings = [...siblings];
    const [movedCategory] = reorderedSiblings.splice(currentIndex, 1);
    if (!movedCategory) {
      return;
    }

    reorderedSiblings.splice(nextIndex, 0, movedCategory);

    try {
      await persistSiblingOrder(reorderedSiblings);
      toast.success(`Category moved ${direction}`);
      await categories.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Unable to move this category ${direction} right now.`));
    }
  };

  const handleDragStart = (category: CategoryTreeRow, event: React.DragEvent<HTMLButtonElement>): void => {
    if (!canWriteCategories) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', category.id);
    dragStateRef.current = {
      draggedCategoryId: category.id,
      dropTargetCategoryId: null,
      dropPlacement: null
    };
    setDraggedCategoryId(category.id);
    setDropTargetCategoryId(null);
    setDropPlacement(null);
  };

  const handleDragOver = (category: CategoryTreeRow, event: React.DragEvent<HTMLDivElement>): void => {
    if (!draggedCategory || draggedCategory.id === category.id || draggedCategory.parent !== category.parent) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const bounds = event.currentTarget.getBoundingClientRect();
    const placement = event.clientY - bounds.top < bounds.height / 2 ? 'before' : 'after';

    if (dropTargetCategoryId === category.id && dropPlacement === placement) {
      return;
    }

    dragStateRef.current = {
      draggedCategoryId: draggedCategory.id,
      dropTargetCategoryId: category.id,
      dropPlacement: placement
    };
    setDropTargetCategoryId(category.id);
    setDropPlacement(placement);
  };

  const handleDrop = async (category: CategoryTreeRow, event: React.DragEvent<HTMLDivElement>): Promise<void> => {
    const activeDraggedCategoryId = dragStateRef.current.draggedCategoryId;
    const activeDropPlacement = dragStateRef.current.dropPlacement;
    const activeDraggedCategory = activeDraggedCategoryId ? categoryRows.find((entry) => entry.id === activeDraggedCategoryId) ?? null : null;

    if (!activeDraggedCategory || activeDraggedCategory.id === category.id || activeDraggedCategory.parent !== category.parent || !activeDropPlacement) {
      resetDragState();
      return;
    }

    event.preventDefault();

    const siblings = categoryRows.filter((item) => item.parent === category.parent);
    const reorderedSiblings = reorderSiblingRows(siblings, activeDraggedCategory.id, category.id, activeDropPlacement);

    try {
      await persistSiblingOrder(reorderedSiblings);
      toast.success('Category reordered');
      await categories.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to save the new category order right now.'));
    } finally {
      resetDragState();
    }
  };

  const handleDeactivateCategory = async (category: CategoryRecord): Promise<void> => {
    if (!window.confirm(`Deactivate "${category.name}"? It will disappear from the active list but can still be restored.`)) {
      return;
    }

    try {
      await adminService.deleteCategory(category.id);
      setShowInactive(true);
      toast.success('Category deactivated. Inactive items are now visible.');
      await categories.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to deactivate this category right now.'));
    }
  };

  const handleRestoreCategory = async (category: CategoryRecord): Promise<void> => {
    try {
      await adminService.updateCategory(category.id, { isActive: true });
      toast.success('Category restored');
      await categories.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to restore this category right now.'));
    }
  };

  const handleDeleteCategory = async (category: CategoryRecord): Promise<void> => {
    if (
      !window.confirm(
        `Permanently delete "${category.name}"? This cannot be undone. Child categories or linked products must be removed first.`
      )
    ) {
      return;
    }

    try {
      await adminService.permanentlyDeleteCategory(category.id);
      toast.success('Category deleted permanently');
      await categories.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to permanently delete this category.'));
    }
  };

  return (
    <div className="space-y-3 pb-2">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Categories"
        description="Category structure, hierarchy, storefront imagery, SEO metadata, and ordering controls in the same refreshed catalog workspace as the rest of the admin panel."
        action={
          canWriteCategories ? (
            <Button onClick={openCreateModal}>Add Category</Button>
          ) : (
            <Badge variant="default" className="bg-white/[0.06] text-gray-300">
              Read Only
            </Badge>
          )
        }
        meta={[
          {
            label: 'Category map',
            value: categoryRows.length.toLocaleString(),
            support: 'All visible category nodes returned by the current catalog feed.',
            tone: 'blue'
          },
          {
            label: 'Products mapped',
            value: mappedProductsCount.toLocaleString(),
            support: 'Products currently assigned into the loaded category tree.',
            tone: mappedProductsCount > 0 ? 'gold' : 'slate'
          },
          {
            label: 'SEO ready',
            value: seoReadyCount.toLocaleString(),
            support: 'Categories with at least one SEO field configured.',
            tone: seoReadyCount > 0 ? 'emerald' : 'slate'
          }
        ]}
      />

      <AdminStatGrid
        items={[
          {
            label: 'Total categories',
            value: categoryRows.length.toLocaleString(),
            support: 'Top-level and nested categories in this view.',
            tone: 'slate'
          },
          {
            label: 'Active',
            value: activeCategories.length.toLocaleString(),
            support: 'Categories currently visible in the storefront.',
            tone: activeCategories.length > 0 ? 'emerald' : 'slate'
          },
          {
            label: 'Subcategories',
            value: subcategoryCount.toLocaleString(),
            support: 'Nested nodes inside the current category tree.',
            tone: 'blue'
          },
          {
            label: 'Inactive',
            value: inactiveCategories.length.toLocaleString(),
            support: inactiveCategories.length > 0 ? 'Items hidden until restored.' : 'No inactive categories right now.',
            tone: inactiveCategories.length > 0 ? 'rose' : 'slate'
          }
        ]}
      />

      <AdminControlPanel>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.24fr)_minmax(220px,0.32fr)]">
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search categories by name, slug, parent, description, or SEO copy"
            label="Search categories"
            resultCount={filteredCategories.length}
            totalCount={visibleCategories.length}
          />
          <div className="flex items-stretch">
            <Button type="button" variant="secondary" className="w-full justify-center" onClick={() => setShowInactive((value) => !value)}>
              {showInactive ? 'Hide Inactive' : 'Show Inactive'}
            </Button>
          </div>
        </div>
        <AdminInlineNotice>
          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-300">
            {showInactive ? 'Full category map' : 'Active category map'}
          </span>
          <p>
            {filteredCategories.length} categor{filteredCategories.length === 1 ? 'y' : 'ies'} match the current search and visibility rules. Drag with the grip or use
            the up and down controls to reorder inside each sibling branch without breaking the tree.
          </p>
        </AdminInlineNotice>
      </AdminControlPanel>

      <AdminDataGrid
        headers={['Category', 'Parent', 'Catalog', 'Status', 'Actions']}
        gridClassName={categoriesTableGridClass}
        hasRows={filteredCategories.length > 0}
        emptyMessage="No categories matched that search."
      >
        {filteredCategories.map((category) => {
          const siblingRows = categoryRows.filter((item) => item.parent === category.parent);
          const siblingIndex = siblingRows.findIndex((item) => item.id === category.id);
          const hasSeoMetadata = Boolean(category.metaTitle || category.metaDescription);
          const hasChildren = Boolean(category.children?.length);
          const isDragTarget = dropTargetCategoryId === category.id && dropPlacement !== null;
          const dropIndicatorClassName =
            isDragTarget && dropPlacement === 'before'
              ? "before:absolute before:inset-x-3 before:top-0 before:h-0.5 before:rounded-full before:bg-gold before:content-[''] sm:before:inset-x-6"
              : isDragTarget && dropPlacement === 'after'
                ? "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-gold after:content-[''] sm:after:inset-x-6"
                : '';

          return (
            <div
              key={category.id}
              data-testid={`category-row-${category.id}`}
              onDragOver={(event) => handleDragOver(category, event)}
              onDrop={(event) => void handleDrop(category, event)}
              onDragEnd={resetDragState}
              className={`${categoriesTableGridClass} relative border-b border-white/5 px-5 py-4 text-sm text-gray-300 last:border-b-0 sm:px-6 ${dropIndicatorClassName} ${
                draggedCategoryId === category.id ? 'opacity-60' : ''
              }`}
            >
              <div className="space-y-1" style={{ paddingLeft: `${category.depth * 18}px` }}>
                <div className="flex flex-wrap items-center gap-2">
                  {canWriteCategories ? (
                    <button
                      type="button"
                      draggable
                      aria-label={`Drag ${category.name}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-gray-400 transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                      onDragStart={(event) => handleDragStart(category, event)}
                      onDragEnd={resetDragState}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  ) : null}
                  <p className="font-medium text-white">{category.name}</p>
                  <Badge variant="default" className="bg-white/[0.06] text-gray-200">
                    {category.depth === 0 ? 'Root' : `Level ${category.depth + 1}`}
                  </Badge>
                  <Badge variant="default" className="bg-white/[0.04] text-gray-400">
                    {hasChildren ? `${category.children?.length ?? 0} child${category.children?.length === 1 ? '' : 'ren'}` : 'Leaf'}
                  </Badge>
                </div>
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">{category.slug}</p>
                <p className="text-xs text-gray-500">{category.pathLabel ? `Path ${category.pathLabel}` : 'Top-level branch'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white">{category.parentName}</p>
                <p className="text-xs text-gray-500">{category.parent ? `Nested ${category.depth} level${category.depth === 1 ? '' : 's'} deep` : 'Top-level category'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white">{category.productCount ?? 0} products</p>
                <p className="text-xs text-gray-500">Sort order {category.order}</p>
                <p className="text-xs text-gray-500">{hasSeoMetadata ? 'SEO copy configured' : 'SEO copy missing'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={category.isActive ? 'success' : 'danger'}>{category.isActive ? 'Active' : 'Inactive'}</Badge>
                <Badge variant="default" className={hasSeoMetadata ? 'bg-emerald-500/10 text-emerald-200' : 'bg-white/[0.05] text-gray-400'}>
                  {hasSeoMetadata ? 'SEO Ready' : 'SEO Pending'}
                </Badge>
              </div>
              <div className="grid w-full max-w-[280px] grid-cols-3 gap-2">
                {category.isActive ? (
                  <>
                    {canWriteCategories ? (
                      <>
                        <Button size="sm" variant="secondary" className="justify-center" onClick={() => openEditModal(category)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="justify-center"
                          disabled={siblingIndex === 0}
                          onClick={() => void moveCategory(category.id, 'up')}
                        >
                          Up
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="justify-center"
                          disabled={siblingIndex === siblingRows.length - 1}
                          onClick={() => void moveCategory(category.id, 'down')}
                        >
                          Down
                        </Button>
                      </>
                    ) : null}
                    {canDeleteCategories ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="col-span-3 justify-center"
                        onClick={() => void handleDeactivateCategory(category)}
                      >
                        Deactivate
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <>
                    {canWriteCategories ? (
                      <Button size="sm" variant="secondary" className="justify-center" onClick={() => openEditModal(category)}>
                        Edit
                      </Button>
                    ) : null}
                    {canWriteCategories ? (
                      <Button
                        size="sm"
                        className={`${canDeleteCategories ? 'col-span-2 justify-center' : 'col-span-3 justify-center'}`}
                        onClick={() => void handleRestoreCategory(category)}
                      >
                        Restore
                      </Button>
                    ) : null}
                    {canDeleteCategories ? (
                      <Button size="sm" variant="danger" className="col-span-3 justify-center" onClick={() => void handleDeleteCategory(category)}>
                        Delete Permanently
                      </Button>
                    ) : null}
                  </>
                )}
                {!canWriteCategories && !canDeleteCategories ? <p className="col-span-3 text-xs text-gray-500">Read-only access</p> : null}
              </div>
            </div>
          );
        })}
      </AdminDataGrid>

      <Modal
        isOpen={isModalOpen}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        onClose={closeModal}
        size="lg"
        bodyClassName="p-0"
      >
        <form
          className="flex flex-col"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              const payload = {
                name: values.name.trim(),
                description: values.description?.trim() ?? '',
                metaTitle: values.metaTitle?.trim() ?? '',
                metaDescription: values.metaDescription?.trim() ?? '',
                order: values.order,
                parent: values.parent ? values.parent : null,
                isActive: Boolean(values.isActive),
                image: buildImagePayload(values)
              };

              if (editingCategory) {
                await adminService.updateCategory(editingCategory.id, payload);
                toast.success('Category updated');
              } else {
                await adminService.createCategory(payload);
                toast.success('Category created');
              }

              closeModal();
              await categories.refetch();
            } catch (error) {
              toast.error(getApiErrorMessage(error, 'Unable to save this category right now.'));
            }
          })}
        >
          <div className="border-b border-white/10 bg-white/[0.03] px-4 py-4 sm:px-6">
            <p className="text-xs uppercase tracking-[0.28em] text-gold">{editingCategory ? 'Category editor' : 'New category'}</p>
            <p className="mt-1.5 max-w-3xl text-sm text-gray-400">
              Manage category structure, storefront visibility, and the image that appears inside the categories menu on the store.
            </p>
          </div>

          <div className="grid gap-4 px-4 py-5 sm:px-6">
            <section className="space-y-4 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <div className="border-b border-white/10 pb-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Structure</p>
                <h3 className="mt-2 font-display text-[1.35rem] text-white">Category Details</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Name" {...form.register('name')} error={form.formState.errors.name?.message} />
                <Input
                  label="Sort Order"
                  type="number"
                  {...form.register('order', { valueAsNumber: true })}
                  error={form.formState.errors.order?.message}
                />
                <label className="flex flex-col gap-2 text-sm text-gray-300">
                  <span>Parent Category</span>
                  <select className={adminFormFieldClassName} {...form.register('parent')}>
                    <option value="">No parent</option>
                    {parentOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {`${category.depth > 0 ? `${'— '.repeat(category.depth)}` : ''}${category.name}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                  <input type="checkbox" {...form.register('isActive')} />
                  Active
                </label>
              </div>
              <Textarea label="Description" {...form.register('description')} error={form.formState.errors.description?.message} />
            </section>

            <section className="space-y-4 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <div className="border-b border-white/10 pb-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Storefront SEO</p>
                <h3 className="mt-2 font-display text-[1.35rem] text-white">Search Metadata</h3>
                <p className="mt-1.5 text-sm text-gray-400">Optional fields that help category landing pages read better in search results and shared links.</p>
              </div>
              <div className="space-y-4">
                <Input
                  label="SEO Title (max 60 chars)"
                  placeholder="Smartphones & Mobile Accessories | NJ Store"
                  {...form.register('metaTitle')}
                  error={form.formState.errors.metaTitle?.message}
                />
                <Textarea
                  label="Meta Description (max 160 chars)"
                  placeholder="Browse smartphones, accessories, and the latest mobile deals at NJ Store with delivery across Sri Lanka."
                  {...form.register('metaDescription')}
                  error={form.formState.errors.metaDescription?.message}
                />
              </div>
            </section>

            <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
              <div className="border-b border-white/10 pb-3.5">
                <h3 className="font-display text-[1.45rem] leading-tight text-white">Category Image</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Upload the real category image from admin so the storefront categories panel uses it directly.
                </p>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#111d33]/85">
                  {watchedImageUrl ? (
                    <img src={watchedImageUrl} alt={watchedImageAlt || 'Category image preview'} className="h-40 w-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-gray-500">
                      <ImagePlus className="h-5 w-5" />
                      Upload or paste a category image to preview it here.
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Input label="Image URL" placeholder="https://..." {...form.register('imageUrl')} error={form.formState.errors.imageUrl?.message} />
                    <div className="flex items-end">
                      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void handleUploadImage(event)} />
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-12 min-w-[156px] justify-center"
                        onClick={() => imageInputRef.current?.click()}
                        isLoading={isUploadingImage}
                      >
                        <Upload className="h-4 w-4" />
                        Upload Image
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Asset Public ID"
                      placeholder="njstore/categories/smartphones"
                      {...form.register('imagePublicId')}
                      error={form.formState.errors.imagePublicId?.message}
                    />
                    <Input
                      label="Alt Text"
                      placeholder="Smartphones category image"
                      {...form.register('imageAlt')}
                      error={form.formState.errors.imageAlt?.message}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            {canWriteCategories ? (
              <Button type="submit" isLoading={form.formState.isSubmitting}>
                {editingCategory ? 'Save Changes' : 'Create Category'}
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
