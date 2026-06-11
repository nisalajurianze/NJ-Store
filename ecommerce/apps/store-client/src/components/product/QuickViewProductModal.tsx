import { useEffect, useState } from 'react';
import type { ProductCardDto, ProductDetailDto } from '@njstore/types';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Modal, QuantityStepper, Skeleton, StarRating } from '@njstore/ui';
import { ExternalLink, Heart, ImageOff, Scale, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useCompare } from '../../context/CompareContext';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { productService } from '../../services/productService';
import { getApiErrorMessage } from '../../utils/apiError';
import { isKnownUnavailableDemoAsset } from '../../utils/imageAssets';
import { toast } from '../../utils/lazyToast';

interface QuickViewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductCardDto;
  isWishlisted: boolean;
  isWishlistPending: boolean;
  onWishlistToggle?: (product: ProductCardDto | ProductDetailDto) => Promise<unknown> | void;
}

const getVariantLabel = (
  variant: {
    color?: string;
    model?: string;
    storage?: string;
    attributes?: Array<{ name: string; value: string }>;
  },
  index: number
): string => {
  const customParts = (variant.attributes ?? [])
    .map((attribute) => `${attribute.name}: ${attribute.value}`)
    .filter(Boolean);
  const parts = [variant.color, variant.storage, variant.model, ...customParts].filter(Boolean);
  return parts.length ? parts.join(' / ') : `Variant ${index + 1}`;
};

const getStockLabel = (stock: number): string => {
  if (stock <= 0) {
    return 'Out of stock';
  }

  if (stock <= 3) {
    return `Only ${stock} left`;
  }

  return `${stock} in stock`;
};

const QuickViewSkeleton = (): JSX.Element => (
  <div className="grid gap-5 lg:grid-cols-[minmax(0,0.96fr)_minmax(280px,0.84fr)]">
    <div className="space-y-4">
      <Skeleton className="h-[320px] rounded-[28px]" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
    <div className="space-y-4">
      <Skeleton className="h-5 w-28 rounded-full" />
      <Skeleton className="h-12 w-3/4 rounded-2xl" />
      <Skeleton className="h-4 w-full rounded-full" />
      <Skeleton className="h-4 w-5/6 rounded-full" />
      <Skeleton className="h-28 rounded-[24px]" />
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
    </div>
  </div>
);

export const QuickViewProductModal = ({
  isOpen,
  onClose,
  product,
  isWishlisted,
  isWishlistPending,
  onWishlistToggle
}: QuickViewProductModalProps): JSX.Element => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { items: compareItems, toggleCompare } = useCompare();
  const { formatCurrency } = useCurrencyFormatter();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const productDetailQuery = useQuery({
    queryKey: ['product-quick-view', product.slug],
    queryFn: () => productService.detail(product.slug),
    enabled: isOpen
  });

  const detailProduct = productDetailQuery.data?.data;
  const selectedVariant = detailProduct && selectedVariantIndex !== undefined ? detailProduct.variants[selectedVariantIndex] : undefined;
  const displayPrice = selectedVariant?.price ?? detailProduct?.price ?? product.price;
  const stockCount = selectedVariant?.stock ?? detailProduct?.stock ?? product.stock;
  const galleryImages = (detailProduct?.images.length
    ? detailProduct.images
    : product.previewImages?.length
      ? product.previewImages
      : product.thumbnail
        ? [product.thumbnail]
        : []
  ).filter(
    (image, index, items) =>
      !isKnownUnavailableDemoAsset(image.url) && items.findIndex((candidate) => candidate.url === image.url) === index
  );
  const activeImage = galleryImages[activeImageIndex] ?? galleryImages[0];
  const isCompared = compareItems.includes(product.id);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveImageIndex(0);
    setQuantity(1);
    setSelectedVariantIndex(detailProduct?.variants.length ? 0 : undefined);
  }, [detailProduct?.id, detailProduct?.variants.length, isOpen]);

  useEffect(() => {
    const maxAllowedQuantity = stockCount > 0 ? stockCount : 1;
    setQuantity((currentQuantity) => Math.min(Math.max(currentQuantity, 1), maxAllowedQuantity));
  }, [stockCount]);

  const handleAddToCart = async (): Promise<void> => {
    if (stockCount <= 0 || isAddingToCart) {
      return;
    }

    try {
      setIsAddingToCart(true);
      const snapshot = detailProduct ?? (await productService.detail(product.slug)).data;

      await addItem({
        productId: snapshot.id || product.id,
        quantity,
        variantIndex: selectedVariantIndex,
        product: snapshot
      });
      toast.success('Added to cart');
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to add this product right now.'));
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleOpenFullPage = (): void => {
    navigate(`/product/${product.slug}`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${product.name} quick view`} size="xl">
      {productDetailQuery.isLoading && !detailProduct ? (
        <QuickViewSkeleton />
      ) : detailProduct ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.96fr)_minmax(300px,0.84fr)]">
          <div className="space-y-4">
            <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),rgba(255,255,255,0.02)_44%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6">
              {activeImage ? (
                <img
                  src={activeImage.url}
                  srcSet={activeImage.srcSet}
                  sizes={activeImage.sizes ?? '(min-width: 1024px) 42vw, 92vw'}
                  alt={activeImage.alt ?? detailProduct.name}
                  loading="lazy"
                  decoding="async"
                  className="max-h-[340px] w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-center text-gray-400">
                  <ImageOff className="h-9 w-9" aria-hidden="true" />
                  <p>No preview image available</p>
                </div>
              )}
            </div>

            {galleryImages.length > 1 ? (
              <div className="grid grid-cols-4 gap-3">
                {galleryImages.slice(0, 4).map((image, index) => (
                  <button
                    key={`${image.publicId ?? image.url}-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`overflow-hidden rounded-2xl border p-2 transition-colors ${
                      index === activeImageIndex ? 'border-gold bg-gold/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                    }`}
                    aria-pressed={index === activeImageIndex}
                  >
                    <img
                      src={image.url}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                      width={64}
                      height={64}
                      className="h-16 w-full object-contain"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.26em] text-gold">{detailProduct.brand}</p>
                <h2 className="mt-2 font-display text-[2rem] leading-tight text-white">{detailProduct.name}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {detailProduct.isBestSeller ? <Badge variant="warning">Best Seller</Badge> : null}
                {detailProduct.isFeatured ? <Badge variant="info">Featured</Badge> : null}
                <Badge variant={stockCount > 0 ? 'success' : 'danger'}>{stockCount > 0 ? 'In stock' : 'Out of stock'}</Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <StarRating value={detailProduct.ratings.average} />
              <span className="text-sm font-medium text-white">{detailProduct.ratings.average.toFixed(1)} / 5</span>
              <span className="text-sm text-gray-400">({detailProduct.ratings.count.toLocaleString()} reviews)</span>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-end gap-3">
                <p className="font-display text-[2.1rem] leading-none text-white">{formatCurrency(displayPrice)}</p>
                {detailProduct.comparePrice ? (
                  <p className="text-sm text-gray-500 line-through">{formatCurrency(detailProduct.comparePrice)}</p>
                ) : null}
              </div>
              <p className={`mt-3 text-sm ${stockCount > 0 ? 'text-emerald-300' : 'text-red-300'}`}>{getStockLabel(stockCount)}</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">{detailProduct.shortDescription}</p>
            </div>

            {detailProduct.variants.length ? (
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Choose a variant</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {detailProduct.variants.map((variant, index) => (
                    <button
                      key={variant.sku}
                      type="button"
                      onClick={() => setSelectedVariantIndex(index)}
                      className={`rounded-2xl border px-3.5 py-3 text-left transition-colors ${
                        selectedVariantIndex === index
                          ? 'border-gold bg-gold/10 text-white'
                          : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20'
                      }`}
                    >
                      <span className="block text-sm font-medium">{getVariantLabel(variant, index)}</span>
                      <span className={`mt-1 block text-xs ${variant.stock > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                        {getStockLabel(variant.stock)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <QuantityStepper
                value={quantity}
                min={1}
                max={Math.max(stockCount, 1)}
                onChange={setQuantity}
                disabled={stockCount <= 0}
              />
              <Button
                className="min-w-[180px]"
                onClick={() => void handleAddToCart()}
                isLoading={isAddingToCart}
                loadingLabel="Adding"
                disabled={stockCount <= 0}
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                {stockCount > 0 ? 'Add to cart' : 'Out of stock'}
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  toggleCompare(product.id);
                }}
              >
                <Scale className="h-4 w-4" aria-hidden="true" />
                {isCompared ? 'Remove compare' : 'Compare'}
              </Button>
              {onWishlistToggle ? (
                <Button
                  variant="secondary"
                  onClick={() => void onWishlistToggle(detailProduct)}
                  isLoading={isWishlistPending}
                  loadingLabel="Saving"
                >
                  <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} aria-hidden="true" />
                  {isWishlisted ? 'Saved' : 'Save'}
                </Button>
              ) : null}
              <Button variant="ghost" onClick={handleOpenFullPage}>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Open product
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
          <p className="text-sm leading-6 text-gray-300">We couldn’t load the latest product preview right now.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void productDetailQuery.refetch()}>
              Try again
            </Button>
            <Button onClick={handleOpenFullPage}>Open product page</Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
