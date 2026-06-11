import type { RefObject } from 'react';
import { Button, QuantityStepper } from '@njstore/ui';
import { Heart, MessageCircle, MessageSquare, Scale, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProductBuyActionsProps {
  buyActionsRef: RefObject<HTMLDivElement>;
  quantity: number;
  stockCount: number;
  isAddingToCart: boolean;
  isCompared: boolean;
  isInWishlist: boolean;
  isWishlistPending: boolean;
  onQuantityChange: (value: number) => void;
  onAddToCart: () => void;
  onToggleCompare: () => void;
  onToggleWishlist: () => void;
  onShare: () => void;
  onWhatsAppShare: () => void;
  onAskQuestion: () => void;
  onOpenStockAlert: () => void;
}

export const ProductBuyActions = ({
  buyActionsRef,
  quantity,
  stockCount,
  isAddingToCart,
  isCompared,
  isInWishlist,
  isWishlistPending,
  onQuantityChange,
  onAddToCart,
  onToggleCompare,
  onToggleWishlist,
  onShare,
  onWhatsAppShare,
  onAskQuestion,
  onOpenStockAlert
}: ProductBuyActionsProps): JSX.Element => {
  const { t } = useTranslation();

  return (
    <div ref={buyActionsRef} className="mt-5 space-y-3 border-t border-white/10 pt-5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <QuantityStepper value={quantity} min={1} max={Math.max(stockCount, 1)} onChange={onQuantityChange} disabled={stockCount <= 0} />
        <Button
          size="lg"
          className="w-full min-w-0"
          onClick={onAddToCart}
          isLoading={isAddingToCart}
          loadingLabel={t('product.actions.adding')}
          disabled={stockCount <= 0}
        >
          {stockCount > 0 ? t('product.actions.addToCart') : t('product.actions.outOfStock')}
        </Button>
      </div>
      {stockCount <= 0 ? (
        <Button variant="secondary" className="w-full" onClick={onOpenStockAlert}>
          {t('product.actions.notifyMe')}
        </Button>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" className="w-full min-w-0" onClick={onToggleCompare}>
          <Scale className="h-4 w-4" aria-hidden="true" />
          {isCompared ? t('product.actions.removeCompare') : t('product.actions.compare')}
        </Button>
        <Button variant="secondary" className="w-full min-w-0" onClick={onToggleWishlist} isLoading={isWishlistPending} loadingLabel={t('product.actions.saving')}>
          <Heart className="h-4 w-4" aria-hidden="true" />
          {isInWishlist ? t('product.actions.saved') : t('product.actions.save')}
        </Button>
        <Button variant="secondary" className="w-full min-w-0" onClick={onShare} aria-label={t('product.actions.shareAria')}>
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {t('product.actions.share')}
        </Button>
        <Button variant="secondary" className="w-full min-w-0" onClick={onWhatsAppShare}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {t('product.actions.whatsApp')}
        </Button>
        <Button variant="secondary" className="col-span-2 w-full min-w-0" onClick={onAskQuestion}>
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          {t('product.actions.askQuestion')}
        </Button>
      </div>
    </div>
  );
};
