import { z } from 'zod';
import type { CategoryDto, ImageAsset } from '@njstore/types';

export type CategoryRecord = CategoryDto;

export interface CategoryTreeRow extends CategoryRecord {
  depth: number;
  parentName: string;
  pathLabel?: string;
  ancestorIds: string[];
}

export type DragPlacement = 'before' | 'after';

export const categorySchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().max(500).optional(),
  metaTitle: z.string().trim().max(60, 'SEO title must be 60 characters or fewer').optional(),
  metaDescription: z.string().trim().max(160, 'Meta description must be 160 characters or fewer').optional(),
  order: z.coerce.number().int().min(0).default(0),
  parent: z.string().optional(),
  imageUrl: z.string().trim().optional(),
  imagePublicId: z.string().trim().optional(),
  imageAlt: z.string().trim().optional(),
  isActive: z.boolean().optional()
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export const sortCategoryTree = (items: CategoryRecord[]): CategoryRecord[] =>
  [...items]
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name))
    .map((item) => ({
      ...item,
      children: item.children ? sortCategoryTree(item.children) : undefined
    }));

export const flattenCategoryTree = (
  items: CategoryRecord[],
  depth = 0,
  ancestors: Array<Pick<CategoryRecord, 'id' | 'name'>> = []
): CategoryTreeRow[] =>
  items.flatMap((item) => {
    const parentName = ancestors[ancestors.length - 1]?.name ?? 'Root';
    const pathLabel = ancestors.map((entry) => entry.name).join(' / ');
    const row: CategoryTreeRow = {
      ...item,
      depth,
      parentName,
      pathLabel: pathLabel || undefined,
      ancestorIds: ancestors.map((entry) => entry.id)
    };

    return [row, ...(item.children ? flattenCategoryTree(item.children, depth + 1, [...ancestors, { id: item.id, name: item.name }]) : [])];
  });

export const buildDefaults = (category?: CategoryRecord): CategoryFormValues => ({
  name: category?.name ?? '',
  description: category?.description ?? '',
  metaTitle: category?.metaTitle ?? '',
  metaDescription: category?.metaDescription ?? '',
  order: category?.order ?? 0,
  parent: category?.parent ?? '',
  imageUrl: category?.image?.url ?? '',
  imagePublicId: category?.image?.publicId ?? '',
  imageAlt: category?.image?.alt ?? '',
  isActive: category?.isActive ?? true
});

export const buildImagePayload = (values: CategoryFormValues): ImageAsset | undefined => {
  const url = values.imageUrl?.trim();
  const publicId = values.imagePublicId?.trim();

  if (!url || !publicId) {
    return undefined;
  }

  return {
    url,
    publicId,
    alt: values.imageAlt?.trim() || undefined
  };
};

export const reorderSiblingRows = (
  siblings: CategoryTreeRow[],
  draggedCategoryId: string,
  targetCategoryId: string,
  placement: DragPlacement
): CategoryTreeRow[] => {
  const nextSiblings = [...siblings];
  const currentIndex = nextSiblings.findIndex((item) => item.id === draggedCategoryId);
  const targetIndex = nextSiblings.findIndex((item) => item.id === targetCategoryId);

  if (currentIndex < 0 || targetIndex < 0) {
    return siblings;
  }

  const [draggedCategory] = nextSiblings.splice(currentIndex, 1);
  if (!draggedCategory) {
    return siblings;
  }

  const adjustedTargetIndex = nextSiblings.findIndex((item) => item.id === targetCategoryId);
  const insertionIndex = placement === 'before' ? adjustedTargetIndex : adjustedTargetIndex + 1;
  nextSiblings.splice(Math.max(0, insertionIndex), 0, draggedCategory);

  return nextSiblings;
};

export const categoriesTableGridClass =
  'grid min-w-[1040px] grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(220px,1.18fr)] items-center gap-4 lg:min-w-0 lg:grid-cols-[minmax(0,1.28fr)_minmax(0,0.94fr)_minmax(0,0.76fr)_minmax(0,0.62fr)_minmax(220px,1.08fr)] lg:gap-3';
