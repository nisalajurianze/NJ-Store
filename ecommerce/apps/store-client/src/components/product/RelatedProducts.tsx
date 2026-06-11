import type { ProductCardDto } from '@njstore/types';
import { Button, SectionHeading } from '@njstore/ui';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProductCard } from './ProductCard';
import { STOREFRONT_PRODUCT_GRID_CLASSNAME } from './productCardLayout';

interface RelatedProductsProps {
  products: ProductCardDto[];
  pendingProductId: string | null;
  isWishlisted: (productId: string) => boolean;
  onWishlistToggle: (product: ProductCardDto) => Promise<void>;
}

export const RelatedProducts = ({
  products,
  pendingProductId,
  isWishlisted,
  onWishlistToggle
}: RelatedProductsProps): JSX.Element | null => {
  const { t } = useTranslation();

  if (!products.length) {
    return null;
  }

  return (
    <section className="mt-10">
      <SectionHeading
        eyebrow={t('product.related.eyebrow')}
        title={t('product.related.title')}
        description={t('product.related.description')}
        action={
          <Link to="/shop">
            <Button variant="secondary">{t('product.notFound.backToShop')}</Button>
          </Link>
        }
      />
      <div className={`mt-6 ${STOREFRONT_PRODUCT_GRID_CLASSNAME}`}>
        {products.map((relatedProduct) => (
          <ProductCard
            key={relatedProduct.id}
            product={relatedProduct}
            isWishlisted={isWishlisted(relatedProduct.id)}
            isWishlistPending={pendingProductId === relatedProduct.id}
            onWishlistToggle={onWishlistToggle}
          />
        ))}
      </div>
    </section>
  );
};
