export interface ProductVersionSnapshot {
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  comparePrice?: number;
  category?: string;
  categoryName?: string;
  brand?: string | null;
  brandName?: string;
  condition?: 'new' | 'used';
  images: Array<{ url: string; publicId: string; alt?: string }>;
  variants: Array<{
    stock: number;
    sku: string;
    color?: string;
    storage?: string;
    model?: string;
    attributes?: Array<{ name: string; value: string }>;
    glowColor?: string;
    price?: number;
    colorCode?: string;
    images?: Array<{ url: string; publicId: string; alt?: string }>;
  }>;
  specifications: Array<{ key: string; value: string }>;
  isActive?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  isFlashDeal?: boolean;
  flashDealEndsAt?: string;
  productType?: 'standard' | 'bundle';
  bundleItems?: Array<{
    product: string;
    quantity: number;
    variantIndex?: number;
  }>;
  publishAt?: string;
  tags?: string[];
  loyaltyPoints?: number;
  sku: string;
  weight?: number;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  warranty?: string;
  videoUrl?: string;
}

const formatBooleanValue = (value?: boolean): string => (value ? 'Yes' : 'No');

const formatDateValue = (value?: string): string => {
  if (!value) {
    return 'Not set';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not set' : parsed.toLocaleString();
};

const summarizeImages = (images: ProductVersionSnapshot['images']): string =>
  images.length ? `${images.length} image${images.length === 1 ? '' : 's'}` : 'No images';

const summarizeVariants = (variants: ProductVersionSnapshot['variants']): string =>
  variants.length
    ? variants
        .map((variant) =>
          [
            variant.sku,
            `${variant.stock} in stock`,
            variant.price != null ? `LKR ${variant.price.toLocaleString()}` : null,
            variant.color || variant.storage || variant.model,
            variant.attributes?.length ? variant.attributes.map((attribute) => `${attribute.name}: ${attribute.value}`).join(', ') : null,
            variant.glowColor ? `Glow ${variant.glowColor}` : null,
            variant.images?.length ? `${variant.images.length} gallery image${variant.images.length === 1 ? '' : 's'}` : null
          ]
            .filter(Boolean)
            .join(' | ')
        )
        .join('\n')
    : 'No variants';

const summarizeSpecifications = (specifications: ProductVersionSnapshot['specifications']): string =>
  specifications.length ? specifications.map((specification) => `${specification.key}: ${specification.value}`).join('\n') : 'No specifications';

const summarizeTags = (tags?: string[]): string => (tags?.length ? tags.join(', ') : 'No tags');

const diffFieldDefinitions: Array<{
  label: string;
  getValue: (snapshot: ProductVersionSnapshot) => unknown;
  format: (value: unknown) => string;
}> = [
  { label: 'Name', getValue: (snapshot) => snapshot.name, format: (value) => String(value || 'Not set') },
  { label: 'Short Description', getValue: (snapshot) => snapshot.shortDescription, format: (value) => String(value || 'Not set') },
  { label: 'Description', getValue: (snapshot) => snapshot.description, format: (value) => String(value || 'Not set') },
  { label: 'Price', getValue: (snapshot) => snapshot.price, format: (value) => `LKR ${Number(value || 0).toLocaleString()}` },
  {
    label: 'Compare Price',
    getValue: (snapshot) => snapshot.comparePrice ?? null,
    format: (value) => (value == null ? 'Not set' : `LKR ${Number(value).toLocaleString()}`)
  },
  { label: 'Category', getValue: (snapshot) => snapshot.categoryName ?? snapshot.category ?? '', format: (value) => String(value || 'Not set') },
  { label: 'Brand', getValue: (snapshot) => snapshot.brandName ?? snapshot.brand ?? '', format: (value) => String(value || 'Not set') },
  { label: 'Condition', getValue: (snapshot) => snapshot.condition ?? 'new', format: (value) => (value === 'used' ? 'Used item' : 'Brand new') },
  { label: 'Master SKU', getValue: (snapshot) => snapshot.sku, format: (value) => String(value || 'Not set') },
  { label: 'Weight', getValue: (snapshot) => snapshot.weight ?? null, format: (value) => (value == null ? 'Not set' : `${value} g`) },
  { label: 'Loyalty Points', getValue: (snapshot) => snapshot.loyaltyPoints ?? 0, format: (value) => String(value ?? 0) },
  { label: 'Featured', getValue: (snapshot) => snapshot.isFeatured ?? false, format: (value) => formatBooleanValue(Boolean(value)) },
  { label: 'Best Seller', getValue: (snapshot) => snapshot.isBestSeller ?? false, format: (value) => formatBooleanValue(Boolean(value)) },
  { label: 'Flash Deal', getValue: (snapshot) => snapshot.isFlashDeal ?? false, format: (value) => formatBooleanValue(Boolean(value)) },
  { label: 'Active', getValue: (snapshot) => snapshot.isActive ?? true, format: (value) => formatBooleanValue(Boolean(value)) },
  { label: 'Flash Deal Ends', getValue: (snapshot) => snapshot.flashDealEndsAt ?? '', format: (value) => formatDateValue(typeof value === 'string' ? value : undefined) },
  { label: 'Publish At', getValue: (snapshot) => snapshot.publishAt ?? '', format: (value) => formatDateValue(typeof value === 'string' ? value : undefined) },
  { label: 'SEO Title', getValue: (snapshot) => snapshot.metaTitle ?? '', format: (value) => String(value || 'Not set') },
  { label: 'Meta Description', getValue: (snapshot) => snapshot.metaDescription ?? '', format: (value) => String(value || 'Not set') },
  { label: 'Canonical URL', getValue: (snapshot) => snapshot.canonicalUrl ?? '', format: (value) => String(value || 'Not set') },
  { label: 'Warranty', getValue: (snapshot) => snapshot.warranty ?? '', format: (value) => String(value || 'Not set') },
  { label: 'Video URL', getValue: (snapshot) => snapshot.videoUrl ?? '', format: (value) => String(value || 'Not set') },
  { label: 'Tags', getValue: (snapshot) => snapshot.tags ?? [], format: (value) => summarizeTags(value as string[] | undefined) },
  { label: 'Images', getValue: (snapshot) => snapshot.images, format: (value) => summarizeImages(value as ProductVersionSnapshot['images']) },
  { label: 'Variants', getValue: (snapshot) => snapshot.variants, format: (value) => summarizeVariants(value as ProductVersionSnapshot['variants']) },
  {
    label: 'Specifications',
    getValue: (snapshot) => snapshot.specifications,
    format: (value) => summarizeSpecifications(value as ProductVersionSnapshot['specifications'])
  }
];

export const getVersionDiffEntries = (selected?: ProductVersionSnapshot, previous?: ProductVersionSnapshot) => {
  if (!selected) {
    return [];
  }

  return diffFieldDefinitions.reduce<Array<{ label: string; previous: string; next: string }>>((entries, field) => {
    const nextValue = field.getValue(selected);
    const previousValue = previous ? field.getValue(previous) : undefined;

    if (JSON.stringify(previousValue ?? null) === JSON.stringify(nextValue ?? null)) {
      return entries;
    }

    entries.push({
      label: field.label,
      previous: field.format(previousValue),
      next: field.format(nextValue)
    });

    return entries;
  }, []);
};
