import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { ReviewDto } from '@njstore/types';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState, Input, Modal, Textarea } from '@njstore/ui';
import { sanitizeRichTextHtml } from '@njstore/utils/safeHtml';
import { useTranslation } from 'react-i18next';
import { analytics } from '../analytics/analytics';
import { StoreBreadcrumbs } from '../components/layout/StoreBreadcrumbs';
import { ProductBuyActions } from '../components/product/ProductBuyActions';
import { ProductDetailSkeleton } from '../components/product/ProductDetailSkeleton';
import { ProductDetailSpecsPanel } from '../components/product/ProductDetailSpecsPanel';
import { ProductGalleryPanel } from '../components/product/ProductGalleryPanel';
import { ProductInfoCard } from '../components/product/ProductInfoCard';
import { ProductQuestionsSection } from '../components/product/ProductQuestionsSection';
import { ProductReviewsSection } from '../components/product/ProductReviewsSection';
import { RelatedProducts } from '../components/product/RelatedProducts';
import type { QuestionFormState, ReviewFormState, ReviewSortOption, StockAlertFormState } from '../components/product/productDetailTypes';
import {
  type VariantSelection,
  buildVariantSelection,
  findPreferredVariantIndex,
  getVariantAttributeGroups,
  getVariantDisplayImages,
  getVariantGlowColor,
  getVariantSummary,
  isVariantOptionSelectable,
  resolveVariantSelectionChange
} from '../components/product/productVariantUtils';
import { SeoHead } from '../components/seo/SeoHead';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';
import { useScrollSpy } from '../hooks/useScrollSpy';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import { useInView } from '../hooks/useInView';
import { useWishlist } from '../hooks/useWishlist';
import { productService } from '../services/productService';
import { reviewService } from '../services/reviewService';
import { buildCanonicalUrl, buildProductSeoKeywords, buildProductStructuredData, resolveSiteUrl } from '../seo/siteMetadata';
import { getApiErrorMessage } from '../utils/apiError';
import { toast } from '../utils/lazyToast';

const REVIEW_FORM_INITIAL_STATE: ReviewFormState = {
  rating: 5,
  title: '',
  comment: ''
};

const PRODUCT_DETAIL_STALE_TIME_MS = 60_000;
const PRODUCT_SUPPORT_STALE_TIME_MS = 60_000;
const RELATED_PRODUCTS_STALE_TIME_MS = 30_000;

const buildQuestionFormInitialState = (user: { name?: string; email?: string } | null): QuestionFormState => ({
  name: user?.name ?? '',
  email: user?.email ?? '',
  message: ''
});

const buildStockAlertFormInitialState = (user: { name?: string; email?: string } | null): StockAlertFormState => ({
  name: user?.name ?? '',
  email: user?.email ?? ''
});

const sortReviews = (reviews: ReviewDto[], sortBy: ReviewSortOption): ReviewDto[] => {
  const sorted = [...reviews];

  sorted.sort((left, right) => {
    if (sortBy === 'recent') {
      const dateDifference = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      if (dateDifference !== 0) {
        return dateDifference;
      }

      return right.helpfulVotes - left.helpfulVotes;
    }

    const helpfulDifference = right.helpfulVotes - left.helpfulVotes;
    if (helpfulDifference !== 0) {
      return helpfulDifference;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

  return sorted;
};

const buildWhatsAppShareUrl = (shareText: string): string => `https://wa.me/?text=${encodeURIComponent(shareText)}`;

const copyTextToClipboard = async (value: string): Promise<void> => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard is unavailable.');
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  const copied = typeof document.execCommand === 'function' ? document.execCommand('copy') : false;
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error('Clipboard is unavailable.');
  }
};

const isValidEmail = (value: string): boolean => /\S+@\S+\.\S+/.test(value);
const DEFAULT_INLINE_ZOOM_SCALE = 2.1;
const MIN_INLINE_ZOOM_SCALE = 1;
const MAX_INLINE_ZOOM_SCALE = 3.4;

const clampInlineZoomScale = (value: number): number => Math.min(Math.max(value, MIN_INLINE_ZOOM_SCALE), MAX_INLINE_ZOOM_SCALE);

export const ProductDetail = (): JSX.Element => {
  const { t } = useTranslation();
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { items: compareItems, toggleCompare } = useCompare();
  const { formatCurrency } = useCurrencyFormatter();
  const { isWishlisted, pendingProductId, toggleWishlist } = useWishlist();
  const buyActionsRef = useRef<HTMLDivElement | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [variantIndex, setVariantIndex] = useState<number | undefined>(undefined);
  const [selectedOptions, setSelectedOptions] = useState<VariantSelection>({});
  const [quantity, setQuantity] = useState(1);
  const [reviewSort, setReviewSort] = useState<ReviewSortOption>('helpful');
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [hasBrandLogoError, setHasBrandLogoError] = useState(false);
  const [pendingHelpfulReviewId, setPendingHelpfulReviewId] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isSendingQuestion, setIsSendingQuestion] = useState(false);
  const [isStockAlertModalOpen, setIsStockAlertModalOpen] = useState(false);
  const [isSavingStockAlert, setIsSavingStockAlert] = useState(false);
  const [isImageZoomEnabled, setIsImageZoomEnabled] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
  const [zoomScale, setZoomScale] = useState(DEFAULT_INLINE_ZOOM_SCALE);
  const [reviewForm, setReviewForm] = useState<ReviewFormState>(REVIEW_FORM_INITIAL_STATE);
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(buildQuestionFormInitialState(user));
  const [stockAlertForm, setStockAlertForm] = useState<StockAlertFormState>(buildStockAlertFormInitialState(user));
  const trackedProductIdRef = useRef<string | null>(null);

  const productQuery = useQuery({
    queryKey: ['product-detail', slug],
    queryFn: () => productService.detail(slug ?? ''),
    enabled: Boolean(slug),
    staleTime: PRODUCT_DETAIL_STALE_TIME_MS
  });

  const product = productQuery.data?.data;
  const { ref: productSupportSectionsRef, inView: shouldLoadProductSupportSections } = useInView({
    enabled: Boolean(product?.id),
    threshold: 0,
    rootMargin: '720px 0px'
  });
  const showStickyAddToCartBar = useScrollSpy({
    targetRef: buyActionsRef,
    enabled: Boolean(product?.id)
  });
  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    if (showStickyAddToCartBar) {
      document.documentElement.dataset.productStickyCart = 'visible';
    } else {
      delete document.documentElement.dataset.productStickyCart;
    }

    return () => {
      delete document.documentElement.dataset.productStickyCart;
    };
  }, [showStickyAddToCartBar]);

  const variantGroups = useMemo(
    () => (product?.productType === 'standard' ? getVariantAttributeGroups(product.variants) : []),
    [product?.productType, product?.variants]
  );
  const selectedVariant = product?.productType === 'standard' && variantIndex !== undefined ? product.variants[variantIndex] : undefined;
  const displayPrice = selectedVariant?.price ?? product?.price ?? 0;
  const stockCount = selectedVariant?.stock ?? product?.stock ?? 0;
  const seoTitle = product?.metaTitle?.trim() || (product ? `${product.name} | NJ Store` : 'NJ Store');
  const seoDescription = product?.metaDescription?.trim() || product?.shortDescription?.trim() || t('product.seo.descriptionFallback');
  const siteUrl = resolveSiteUrl(import.meta.env.VITE_SITE_URL, typeof window !== 'undefined' ? window.location.href : undefined);
  const canonicalUrl = product?.canonicalUrl?.trim() || (product ? `/product/${product.slug}` : undefined);

  const reviewsQuery = useQuery({
    queryKey: ['product-reviews', product?.id],
    queryFn: () => reviewService.listByProduct(product?.id ?? ''),
    enabled: Boolean(product?.id) && shouldLoadProductSupportSections,
    staleTime: PRODUCT_SUPPORT_STALE_TIME_MS
  });

  const questionsQuery = useQuery({
    queryKey: ['product-questions', product?.id],
    queryFn: () => productService.questions(product?.id ?? ''),
    enabled: Boolean(product?.id) && shouldLoadProductSupportSections,
    staleTime: PRODUCT_SUPPORT_STALE_TIME_MS
  });

  const relatedProductsQuery = useQuery({
    queryKey: ['related-products', product?.id, product?.category?.id, product?.brandSlug ?? product?.brand],
    queryFn: async () => {
      if (!product) {
        return { data: [] };
      }

      const response = product.category?.id
        ? await productService.list({ category: [product.category.id], excludeIds: [product.id], limit: 4, sort: 'popular' })
        : await productService.list({ brand: [product.brandSlug ?? product.brand], excludeIds: [product.id], limit: 4, sort: 'popular' });

      return {
        data: response.data
      };
    },
    enabled: Boolean(product?.id) && shouldLoadProductSupportSections,
    staleTime: RELATED_PRODUCTS_STALE_TIME_MS
  });

  useEffect(() => {
    setActiveImageIndex(0);
    setQuantity(1);
    if (product?.productType === 'standard' && product.variants.length) {
      const initialVariantIndex = findPreferredVariantIndex(product.variants);
      const initialVariant = initialVariantIndex !== undefined ? product.variants[initialVariantIndex] : undefined;

      setVariantIndex(initialVariantIndex);
      setSelectedOptions(initialVariant ? buildVariantSelection(initialVariant, variantGroups) : {});
    } else {
      setVariantIndex(undefined);
      setSelectedOptions({});
    }
    setReviewSort('helpful');
    setIsQuestionModalOpen(false);
    setIsStockAlertModalOpen(false);
    setIsImageZoomEnabled(false);
    setZoomScale(DEFAULT_INLINE_ZOOM_SCALE);
    setZoomOrigin({ x: 50, y: 50 });
    setZoomOffset({ x: 0, y: 0 });
    setHasBrandLogoError(false);
  }, [product?.id, product?.productType, product?.variants, variantGroups]);

  useEffect(() => {
    setActiveImageIndex(0);
    setIsImageZoomEnabled(false);
    setZoomScale(DEFAULT_INLINE_ZOOM_SCALE);
    setZoomOrigin({ x: 50, y: 50 });
    setZoomOffset({ x: 0, y: 0 });
  }, [selectedVariant?.sku]);

  useEffect(() => {
    if (!product) {
      return;
    }

    void productService.trackRecentlyViewed(product.id, user ? undefined : product).catch(() => undefined);
  }, [product?.id, user?.id]);

  useEffect(() => {
    if (!product || trackedProductIdRef.current === product.id) {
      return;
    }

    trackedProductIdRef.current = product.id;
    analytics.trackProductViewed(product, displayPrice, stockCount);
  }, [displayPrice, product, stockCount]);

  useEffect(() => {
    const maxAllowedQuantity = stockCount > 0 ? stockCount : 1;
    setQuantity((currentQuantity) => Math.min(Math.max(currentQuantity, 1), maxAllowedQuantity));
  }, [stockCount]);

  useEffect(() => {
    if (isQuestionModalOpen) {
      return;
    }

    setQuestionForm(buildQuestionFormInitialState(user));
  }, [isQuestionModalOpen, product?.id, user?.email, user?.name]);

  useEffect(() => {
    if (isStockAlertModalOpen) {
      return;
    }

    setStockAlertForm(buildStockAlertFormInitialState(user));
  }, [isStockAlertModalOpen, product?.id, user?.email, user?.name]);

  const handleAddToCart = async (): Promise<void> => {
    if (!product || isAddingToCart || stockCount <= 0) {
      return;
    }

    try {
      setIsAddingToCart(true);
      await addItem({
        productId: product.id,
        quantity,
        variantIndex,
        product
      });
      analytics.trackAddToCart({
        product,
        quantity,
        price: displayPrice,
        origin: 'product_detail'
      });
      toast.success(t('product.toast.addedToCart', { quantity }));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('product.toast.addToCartError')));
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleHelpfulVote = async (review: ReviewDto): Promise<void> => {
    const queryKey = ['product-reviews', product?.id];
    const previousReviews = queryClient.getQueryData<ReviewDto[]>(queryKey);
    const nextViewerHasHelpfulVote = !review.viewerHasHelpfulVote;

    try {
      setPendingHelpfulReviewId(review.id);
      queryClient.setQueryData<ReviewDto[]>(queryKey, (current) =>
        current?.map((item) =>
          item.id === review.id
            ? {
                ...item,
                helpfulVotes: Math.max(0, item.helpfulVotes + (nextViewerHasHelpfulVote ? 1 : -1)),
                viewerHasHelpfulVote: nextViewerHasHelpfulVote
              }
            : item
        )
      );
      const updatedReview = await reviewService.toggleHelpful(review.id);
      queryClient.setQueryData<ReviewDto[]>(queryKey, (current) =>
        current?.map((item) => (item.id === updatedReview.id ? updatedReview : item))
      );
      toast.success(t('product.toast.reviewFeedbackUpdated'));
    } catch (error) {
      queryClient.setQueryData(queryKey, previousReviews);
      toast.error(getApiErrorMessage(error, t('product.toast.reviewFeedbackError')));
    } finally {
      setPendingHelpfulReviewId(null);
    }
  };

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!product || isSubmittingReview) {
      return;
    }

    try {
      setIsSubmittingReview(true);
      await reviewService.create({
        product: product.id,
        rating: reviewForm.rating,
        title: reviewForm.title.trim(),
        comment: reviewForm.comment.trim()
      });
      toast.success(t('product.toast.reviewSubmitted'));
      setReviewForm(REVIEW_FORM_INITIAL_STATE);
      await reviewsQuery.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('product.toast.reviewSubmitError')));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleShare = async (): Promise<void> => {
    if (typeof window === 'undefined') {
      toast.error(t('product.toast.shareUnavailable'));
      return;
    }

    const productUrl = window.location.href;
    const shareData = {
      title: product?.name ?? t('product.share.titleFallback'),
      text: product?.shortDescription ?? product?.name ?? t('product.share.textFallback'),
      url: productUrl
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await copyTextToClipboard(productUrl);
      toast.success(t('product.toast.linkCopied'));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      toast.error(t('product.toast.shareError'));
    }
  };

  const handleWhatsAppShare = (): void => {
    if (!product || typeof window === 'undefined') {
      toast.error(t('product.toast.shareUnavailable'));
      return;
    }

    window.open(
      buildWhatsAppShareUrl(t('product.share.whatsAppMessage', { productName: product.name, productUrl: window.location.href })),
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleQuestionSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!product || isSendingQuestion) {
      return;
    }

    const trimmedName = questionForm.name.trim();
    const trimmedEmail = questionForm.email.trim();
    const trimmedMessage = questionForm.message.trim();

    if (!trimmedName || !isValidEmail(trimmedEmail) || trimmedMessage.length < 10) {
      toast.error(t('product.toast.completeQuestionForm'));
      return;
    }

    try {
      setIsSendingQuestion(true);
      await productService.askQuestion(product.id, {
        customerName: trimmedName,
        customerEmail: trimmedEmail,
        question: trimmedMessage
      });
      await questionsQuery.refetch();
      toast.success(t('product.toast.questionSubmitted'));
      setQuestionForm(buildQuestionFormInitialState(user));
      setIsQuestionModalOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('product.toast.questionError')));
    } finally {
      setIsSendingQuestion(false);
    }
  };

  const handleStockAlertSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!product || isSavingStockAlert) {
      return;
    }

    const trimmedName = stockAlertForm.name.trim();
    const trimmedEmail = stockAlertForm.email.trim();

    if (!trimmedName || !isValidEmail(trimmedEmail)) {
      toast.error(t('product.toast.validNameEmail'));
      return;
    }

    try {
      setIsSavingStockAlert(true);
      await productService.subscribeToBackInStock(product.id, {
        name: trimmedName,
        email: trimmedEmail,
        variantIndex: product.productType === 'standard' ? variantIndex : undefined
      });
      toast.success(t('product.toast.stockAlertSaved'));
      setStockAlertForm(buildStockAlertFormInitialState(user));
      setIsStockAlertModalOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('product.toast.stockAlertError')));
    } finally {
      setIsSavingStockAlert(false);
    }
  };

  const handleGalleryZoomOriginChange = (origin: { x: number; y: number }): void => {
    setZoomOrigin({
      x: Math.min(Math.max(origin.x, 0), 100),
      y: Math.min(Math.max(origin.y, 0), 100)
    });
  };

  const handleGalleryZoomScaleChange = (nextScale: number): void => {
    setZoomScale(clampInlineZoomScale(nextScale));
  };

  const handleGalleryZoomOffsetChange = (offset: { x: number; y: number }): void => {
    setZoomOffset(offset);
  };

  if (!slug) {
    return (
      <div className="page-shell page-nav-gap pb-0">
        <EmptyState
          title={t('product.notFound.title')}
          description={t('product.notFound.slugDescription')}
          action={
            <Link to="/shop">
              <Button>{t('product.notFound.backToShop')}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (productQuery.isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (!product || productQuery.isError) {
    return (
      <div className="page-shell page-nav-gap pb-0">
        <EmptyState
          title={t('product.notFound.title')}
          description={t('product.notFound.missingDescription')}
          action={
            <Link to="/shop">
              <Button>{t('product.notFound.browseProducts')}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const galleryImages = getVariantDisplayImages(product, selectedVariant);
  const activeImage = galleryImages[activeImageIndex] ?? galleryImages[0];
  const glowColor = getVariantGlowColor(selectedVariant, selectedOptions);
  const isCompared = compareItems.includes(product.id);
  const isInWishlist = isWishlisted(product.id);
  const currentReviews = sortReviews(reviewsQuery.data ?? [], reviewSort);
  const answeredQuestions = questionsQuery.data?.data ?? [];
  const averageRatingLabel = `${product.ratings.average.toFixed(1)} / 5`;
  const sanitizedDescription = sanitizeRichTextHtml(product.description);
  const hasBrandLogo = Boolean(product.brandLogoUrl && !hasBrandLogoError);
  const selectedVariantSummary =
    selectedVariant && variantIndex !== undefined ? getVariantSummary(selectedVariant, variantGroups, variantIndex) : undefined;
  const breadcrumbItems = [
    { label: t('product.breadcrumb.shop'), to: '/shop' },
    product.category?.name ? { label: product.category.name, to: `/shop?category=${product.category.id}` } : null,
    { label: product.name }
  ].filter(Boolean) as Array<{ label: string; to?: string }>;
  const resolvedCanonicalUrl = buildCanonicalUrl(canonicalUrl, siteUrl);
  const productStructuredData = resolvedCanonicalUrl
    ? buildProductStructuredData({
        product,
        siteUrl,
        canonicalUrl: resolvedCanonicalUrl,
        price: displayPrice,
        stock: stockCount,
        sku: selectedVariant?.sku ?? product.sku
      })
    : undefined;
  const productSeoImage = activeImage?.url ?? product.thumbnail?.url;
  const handleGalleryImageSelect = (nextIndex: number): void => {
    setActiveImageIndex(nextIndex);
    setIsImageZoomEnabled(false);
    setZoomScale(DEFAULT_INLINE_ZOOM_SCALE);
    setZoomOrigin({ x: 50, y: 50 });
    setZoomOffset({ x: 0, y: 0 });
  };
  const handleVariantOptionSelect = (key: keyof VariantSelection, option: string): void => {
    if (!product || product.productType !== 'standard') {
      return;
    }

    if (!isVariantOptionSelectable(product.variants, variantGroups, selectedOptions, key, option)) {
      return;
    }

    const nextSelection = resolveVariantSelectionChange(product.variants, variantGroups, selectedOptions, key, option);
    if (!nextSelection) {
      return;
    }

    setSelectedOptions(nextSelection.selection);
    setVariantIndex(nextSelection.variantIndex);
  };
  const handleVariantIndexSelect = (nextVariantIndex: number): void => {
    if (!product || product.productType !== 'standard') {
      return;
    }

    const nextVariant = product.variants[nextVariantIndex];
    if (!nextVariant) {
      return;
    }

    setSelectedOptions(buildVariantSelection(nextVariant, variantGroups));
    setVariantIndex(nextVariantIndex);
  };

  return (
    <div className="page-shell page-nav-gap pb-0">
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        keywords={buildProductSeoKeywords(product)}
        canonicalUrl={canonicalUrl}
        openGraphType="product"
        openGraphImage={productSeoImage}
        jsonLd={productStructuredData}
        additionalMeta={[
          { property: 'product:price:amount', content: displayPrice.toFixed(2) },
          { property: 'product:price:currency', content: 'LKR' },
          { property: 'product:availability', content: stockCount > 0 ? 'in stock' : 'out of stock' }
        ]}
      />
      <StoreBreadcrumbs items={breadcrumbItems} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,500px)] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_minmax(380px,540px)]">
        <ProductGalleryPanel
          product={product}
          activeImageIndex={activeImageIndex}
          glowColor={glowColor}
          galleryImages={galleryImages}
          isZoomEnabled={isImageZoomEnabled}
          zoomOffset={zoomOffset}
          zoomOrigin={zoomOrigin}
          zoomScale={zoomScale}
          onToggleZoom={() => {
            setIsImageZoomEnabled((current) => {
              if (current) {
                setZoomScale(DEFAULT_INLINE_ZOOM_SCALE);
                setZoomOffset({ x: 0, y: 0 });
                setZoomOrigin({ x: 50, y: 50 });
              }

              return !current;
            });
          }}
          onZoomOffsetChange={handleGalleryZoomOffsetChange}
          onZoomOriginChange={handleGalleryZoomOriginChange}
          onZoomScaleChange={handleGalleryZoomScaleChange}
          onSelectImage={handleGalleryImageSelect}
        />

        <ProductInfoCard
          product={product}
          hasBrandLogo={hasBrandLogo}
          averageRatingLabel={averageRatingLabel}
          displayPrice={displayPrice}
          formatCurrency={formatCurrency}
          selectedVariant={selectedVariant}
          variantIndex={variantIndex}
          variantGroups={variantGroups}
          selectedOptions={selectedOptions}
          sanitizedDescription={sanitizedDescription}
          stockCount={stockCount}
          onBrandLogoError={() => setHasBrandLogoError(true)}
          onSelectVariantOption={handleVariantOptionSelect}
          onSelectVariantIndex={handleVariantIndexSelect}
          buyActions={
            <ProductBuyActions
              buyActionsRef={buyActionsRef}
              quantity={quantity}
              stockCount={stockCount}
              isAddingToCart={isAddingToCart}
              isCompared={isCompared}
              isInWishlist={isInWishlist}
              isWishlistPending={pendingProductId === product.id}
              onQuantityChange={setQuantity}
              onAddToCart={() => void handleAddToCart()}
              onToggleCompare={() => toggleCompare(product.id)}
              onToggleWishlist={() => void toggleWishlist(product)}
              onShare={() => void handleShare()}
              onWhatsAppShare={handleWhatsAppShare}
              onAskQuestion={() => setIsQuestionModalOpen(true)}
              onOpenStockAlert={() => setIsStockAlertModalOpen(true)}
            />
          }
        />
      </div>

      <ProductDetailSpecsPanel product={product} />

      <section ref={productSupportSectionsRef}>
        <ProductReviewsSection
          currentReviews={currentReviews}
          isLoading={reviewsQuery.isLoading}
          isSignedIn={Boolean(user)}
          reviewSort={reviewSort}
          pendingHelpfulReviewId={pendingHelpfulReviewId}
          reviewForm={reviewForm}
          isSubmittingReview={isSubmittingReview}
          onReviewSortChange={setReviewSort}
          onHelpfulVote={(review) => void handleHelpfulVote(review)}
          onReviewFormChange={setReviewForm}
          onReviewSubmit={(event) => void handleReviewSubmit(event)}
        />

        <ProductQuestionsSection
          questions={answeredQuestions}
          isLoading={questionsQuery.isLoading}
        />

        <RelatedProducts
          products={relatedProductsQuery.data?.data ?? []}
          pendingProductId={pendingProductId}
          isWishlisted={isWishlisted}
          onWishlistToggle={toggleWishlist}
        />
      </section>

      <Modal isOpen={isQuestionModalOpen} onClose={() => setIsQuestionModalOpen(false)} title={t('product.questionModal.title')}>
        <p className="text-sm leading-6 text-gray-300">
          {t('product.questionModal.descriptionPrefix')} <span className="font-medium text-white">{product.name}</span> {t('product.questionModal.descriptionSuffix')}
        </p>

        <form className="mt-6 grid gap-4" onSubmit={(event) => void handleQuestionSubmit(event)}>
          <Input
            label={t('product.questionModal.name')}
            value={questionForm.name}
            onChange={(event) => setQuestionForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label={t('product.questionModal.email')}
            type="email"
            value={questionForm.email}
            onChange={(event) => setQuestionForm((current) => ({ ...current, email: event.target.value }))}
          />
          <Textarea
            label={t('product.questionModal.question')}
            value={questionForm.message}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setQuestionForm((current) => ({ ...current, message: event.target.value }))
            }
            placeholder={t('product.questionModal.placeholder')}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" isLoading={isSendingQuestion} loadingLabel={t('product.actions.sending')}>
              {t('product.questionModal.submit')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsQuestionModalOpen(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isStockAlertModalOpen} onClose={() => setIsStockAlertModalOpen(false)} title={t('product.stockAlert.title')}>
        <p className="text-sm leading-6 text-gray-300">
          {t('product.stockAlert.descriptionPrefix')} <span className="font-medium text-white">{product.name}</span>
          {selectedVariantSummary ? ` (${selectedVariantSummary})` : ''} {t('product.stockAlert.descriptionSuffix')}
        </p>

        <form className="mt-6 grid gap-4" onSubmit={(event) => void handleStockAlertSubmit(event)}>
          <Input
            label={t('product.stockAlert.name')}
            value={stockAlertForm.name}
            onChange={(event) => setStockAlertForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label={t('product.stockAlert.email')}
            type="email"
            value={stockAlertForm.email}
            onChange={(event) => setStockAlertForm((current) => ({ ...current, email: event.target.value }))}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" isLoading={isSavingStockAlert} loadingLabel={t('product.actions.saving')}>
              {t('product.actions.notifyMe')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsStockAlertModalOpen(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Modal>

      <div
        data-product-sticky-cart={showStickyAddToCartBar ? 'visible' : 'hidden'}
        className={`product-sticky-cart-bar fixed inset-x-0 bottom-[calc(3rem+env(safe-area-inset-bottom))] z-30 h-[3.25rem] border-y border-white/10 bg-[linear-gradient(180deg,rgba(27,27,26,0.98),rgba(18,18,17,0.98))] px-4 shadow-[0_-8px_18px_rgba(0,0,0,0.24)] backdrop-blur-md transition-[transform,opacity] duration-300 sm:bottom-[calc(3.5rem+env(safe-area-inset-bottom))] sm:h-[3.4rem] lg:hidden ${
          showStickyAddToCartBar ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
        }`}
        aria-hidden={!showStickyAddToCartBar}
      >
        <div className="mx-auto grid h-full max-w-2xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11.5px] font-medium leading-3 text-white/90">{product.name}</p>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0">
              <p className="whitespace-nowrap font-mono text-[12.5px] font-semibold leading-4 text-gold">{formatCurrency(displayPrice)}</p>
              <p className={`whitespace-nowrap text-[10.5px] font-semibold leading-4 ${stockCount > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {stockCount > 0 ? t('product.badges.inStock') : t('product.badges.outOfStock')}
              </p>
            </div>
          </div>
          <Button size="sm" className="h-8 shrink-0 rounded-full px-4 text-[12.5px] shadow-[0_8px_18px_rgba(216,181,65,0.16)]" disabled={stockCount <= 0} onClick={() => void handleAddToCart()}>
            {t('product.actions.addToCart')}
          </Button>
        </div>
      </div>
    </div>
  );
};
