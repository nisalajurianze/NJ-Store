interface ProductCsvRecord {
  name: string;
  brand: string;
  condition?: 'new' | 'used';
  sku: string;
  price: number;
  comparePrice?: number;
  variants: Array<{ stock: number }>;
  category?: { name?: string };
  isActive: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isFlashDeal?: boolean;
  flashDealEndsAt?: string;
  publishAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  tags?: string[];
  weight?: number;
  loyaltyPoints?: number;
  images: Array<{ url: string; publicId: string; alt?: string }>;
  shortDescription: string;
  description: string;
}

const escapeCsvValue = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;

const buildProductsCsv = (productList: ProductCsvRecord[]): string => {
  const headers = [
    'Name',
    'Brand',
    'Condition',
    'SKU',
    'Price',
    'ComparePrice',
    'Stock',
    'Category',
    'Active',
    'FeaturedStatus',
    'BestSeller',
    'FlashDeal',
    'FlashDealEndsAt',
    'PublishAt',
    'MetaTitle',
    'MetaDescription',
    'CanonicalUrl',
    'Tags',
    'Weight',
    'LoyaltyPoints',
    'ImageUrl',
    'ImagePublicId',
    'ImageAlt',
    'ShortDescription',
    'Description'
  ];
  const rows = productList.map((product) => [
    escapeCsvValue(product.name),
    escapeCsvValue(product.brand),
    escapeCsvValue(product.condition === 'used' ? 'Used' : 'New'),
    escapeCsvValue(product.sku),
    escapeCsvValue(product.price),
    escapeCsvValue(product.comparePrice ?? ''),
    escapeCsvValue(product.variants.reduce((sum, variant) => sum + variant.stock, 0)),
    escapeCsvValue(product.category?.name ?? ''),
    escapeCsvValue(product.isActive ? 'Yes' : 'No'),
    escapeCsvValue(product.isFeatured ? 'Yes' : 'No'),
    escapeCsvValue(product.isBestSeller ? 'Yes' : 'No'),
    escapeCsvValue(product.isFlashDeal ? 'Yes' : 'No'),
    escapeCsvValue(product.flashDealEndsAt ?? ''),
    escapeCsvValue(product.publishAt ?? ''),
    escapeCsvValue(product.metaTitle ?? ''),
    escapeCsvValue(product.metaDescription ?? ''),
    escapeCsvValue(product.canonicalUrl ?? ''),
    escapeCsvValue((product.tags ?? []).join(', ')),
    escapeCsvValue(product.weight ?? ''),
    escapeCsvValue(product.loyaltyPoints ?? 0),
    escapeCsvValue(product.images[0]?.url ?? ''),
    escapeCsvValue(product.images[0]?.publicId ?? ''),
    escapeCsvValue(product.images[0]?.alt ?? ''),
    escapeCsvValue(product.shortDescription),
    escapeCsvValue(product.description)
  ]);
  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
};

const buildProductsCsvInWorker = (productList: ProductCsvRecord[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./productCsvExport.worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (event: MessageEvent<{ csv: string }>) => {
      worker.terminate();
      resolve(event.data.csv);
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(event.error ?? new Error(event.message));
    };
    worker.postMessage({ productList });
  });

export const exportProductsCsv = async (productList: ProductCsvRecord[]): Promise<void> => {
  let csv: string;
  try {
    csv = await buildProductsCsvInWorker(productList);
  } catch {
    csv = buildProductsCsv(productList);
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `njstore-products-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
