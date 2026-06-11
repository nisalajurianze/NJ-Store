import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart, RefreshCcw, Trash2 } from 'lucide-react';
import { Button, EmptyState, SectionHeading, Skeleton } from '@njstore/ui';
import { Link } from 'react-router-dom';
import { ProductCard } from '../../components/product/ProductCard';
import {
  STOREFRONT_PRODUCT_CARD_SKELETON_CLASSNAME,
  STOREFRONT_PRODUCT_GRID_CLASSNAME
} from '../../components/product/productCardLayout';
import { useWishlist } from '../../hooks/useWishlist';
import { productService } from '../../services/productService';

export const DashboardWishlist = (): JSX.Element => {
  const wishlist = useWishlist();
  const recentlyViewedQuery = useQuery({
    queryKey: ['dashboard', 'recently-viewed'],
    queryFn: () => productService.recentlyViewed(),
    staleTime: 60_000
  });
  const recentlyViewedProducts = useMemo(() => {
    const wishlistIds = new Set(wishlist.items.map((item) => item.id));
    const serverItems = recentlyViewedQuery.data?.data ?? [];
    const fallbackItems = typeof productService.getLocalRecentlyViewed === 'function' ? productService.getLocalRecentlyViewed() : [];
    return (serverItems.length ? serverItems : fallbackItems).filter((product) => !wishlistIds.has(product.id)).slice(0, 3);
  }, [recentlyViewedQuery.data?.data, wishlist.items]);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Wishlist"
        description="Saved products you can revisit when you are ready to request a quotation."
      />

      {wishlist.isLoading ? (
        <div className={STOREFRONT_PRODUCT_GRID_CLASSNAME}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className={STOREFRONT_PRODUCT_CARD_SKELETON_CLASSNAME} />
          ))}
        </div>
      ) : null}

      {wishlist.isError ? (
        <EmptyState
          icon={<RefreshCcw className="h-6 w-6 text-gold" />}
          title="Unable to load your wishlist"
          description="There was a problem fetching your saved products. Try refreshing the list."
          action={
            <Button variant="secondary" onClick={() => void wishlist.refetch()}>
              Try Again
            </Button>
          }
        />
      ) : null}

      {!wishlist.isLoading && !wishlist.isError && !wishlist.items.length ? (
        <>
          <EmptyState
            icon={<Heart className="h-6 w-6 text-gold" />}
            title="Your wishlist is empty"
            description="Save products while you browse so you can compare them later, build a shortlist, and return when you’re ready to request a quotation."
            action={
              <Link to="/shop">
                <Button>Browse Products</Button>
              </Link>
            }
          />
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                title: 'Save while comparing',
                description: 'Use the heart icon on product cards to keep options without interrupting your browsing flow.'
              },
              {
                title: 'Return from any device',
                description: 'Signed-in wishlist items stay ready in your account dashboard whenever you come back.'
              },
              {
                title: 'Move to cart later',
                description: 'Once you decide, add saved items to the cart and continue toward quotation checkout.'
              }
            ].map((item) => (
              <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="mt-2 text-xs leading-5 text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {!wishlist.isLoading && !wishlist.isError && wishlist.items.length ? (
        <div className={STOREFRONT_PRODUCT_GRID_CLASSNAME}>
          {wishlist.items.map((product) => (
            <div key={product.id} className="flex min-w-0 flex-col gap-3">
              <ProductCard
                product={product}
                isWishlisted
                isWishlistPending={wishlist.pendingProductId === product.id}
                onWishlistToggle={wishlist.toggleWishlist}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full justify-center"
                isLoading={wishlist.pendingProductId === product.id}
                loadingLabel="Removing..."
                onClick={() => void wishlist.toggleWishlist(product)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Remove from Wishlist
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {!wishlist.isLoading && !wishlist.isError && !wishlist.items.length && recentlyViewedProducts.length ? (
        <section>
          <SectionHeading
            eyebrow="Recently Viewed"
            title="Revisit a few products first"
            description="These are the last items you checked, so it’s easy to start saving from there."
            size="compact"
          />
          <div className={`mt-4 sm:mt-5 ${STOREFRONT_PRODUCT_GRID_CLASSNAME}`}>
            {recentlyViewedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={wishlist.isWishlisted(product.id)}
                isWishlistPending={wishlist.pendingProductId === product.id}
                onWishlistToggle={wishlist.toggleWishlist}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};
