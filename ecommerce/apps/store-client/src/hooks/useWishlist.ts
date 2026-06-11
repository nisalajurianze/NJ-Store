import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProductCardDto, ProductDetailDto } from '@njstore/types';
import { toProductDetailSnapshot } from '@njstore/utils/productSnapshots';
import { useAuth } from '../context/AuthContext';
import { productService } from '../services/productService';
import { analytics } from '../analytics/analytics';
import { toast } from '../utils/lazyToast';

type WishlistQueryResult = Awaited<ReturnType<typeof productService.wishlist>>;
type WishlistSnapshot = ProductCardDto | ProductDetailDto;

/**
 * Keeps wishlist state synchronized across cards, detail pages, and the dashboard.
 */
export const useWishlist = (): {
  items: ProductDetailDto[];
  isLoading: boolean;
  isError: boolean;
  pendingProductId: string | null;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (product: WishlistSnapshot) => Promise<void>;
  refetch: () => Promise<unknown>;
} => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['wishlist', user?.id] as const;

  const wishlistQuery = useQuery({
    queryKey,
    queryFn: () => productService.wishlist(),
    enabled: Boolean(user)
  });

  const items = user ? wishlistQuery.data?.data ?? [] : [];
  const wishlistIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const isWishlisted = useCallback((productId: string) => wishlistIds.has(productId), [wishlistIds]);

  const mutation = useMutation({
    mutationFn: async ({ productId }: { productId: string; snapshot: WishlistSnapshot }) => {
      if (!user) {
        throw new Error('AUTH_REQUIRED');
      }
      return productService.toggleWishlist(productId);
    },
    onMutate: async ({ productId, snapshot }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<WishlistQueryResult>(queryKey);
      const currentItems = previous?.data ?? [];
      const alreadySaved = currentItems.some((item) => item.id === productId);

      queryClient.setQueryData<WishlistQueryResult>(queryKey, {
        data: alreadySaved ? currentItems.filter((item) => item.id !== productId) : [toProductDetailSnapshot(snapshot), ...currentItems]
      });

      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }

      if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
        toast.error('Sign in to save products to your wishlist');
        return;
      }

      toast.error('Unable to update wishlist right now');
    },
    onSuccess: (result, variables) => {
      analytics.trackWishlistToggle(variables.snapshot, result.data.added ? 'add' : 'remove');
      toast.success(result.data.added ? 'Added to wishlist' : 'Removed from wishlist');
    },
    onSettled: async (_data, error) => {
      if (!error && user) {
        await queryClient.invalidateQueries({ queryKey });
      }
    }
  });
  const { mutateAsync } = mutation;
  const { refetch: refetchWishlist } = wishlistQuery;

  const toggleWishlist = useCallback(
    async (product: WishlistSnapshot) => {
      await mutateAsync({ productId: product.id, snapshot: product });
    },
    [mutateAsync]
  );
  const refetch = useCallback(async () => refetchWishlist(), [refetchWishlist]);

  return {
    items,
    isLoading: user ? wishlistQuery.isLoading : false,
    isError: Boolean(user && wishlistQuery.isError),
    pendingProductId: mutation.isPending ? mutation.variables?.productId ?? null : null,
    isWishlisted,
    toggleWishlist,
    refetch
  };
};
