import { useQuery } from '@tanstack/react-query';
import { Button, Card, SectionHeading } from '@njstore/ui';
import { ProductComparisonGrid } from '../components/product/ProductComparisonGrid';
import { useCompare } from '../context/CompareContext';
import { productService } from '../services/productService';

export const Compare = (): JSX.Element => {
  const { items, clearCompare, toggleCompare } = useCompare();
  const products = useQuery({
    queryKey: ['compare', items],
    queryFn: () => productService.compare(items),
    enabled: items.length > 0,
    staleTime: 30_000
  });

  return (
    <div className="page-shell page-nav-gap min-h-[calc(100vh-24rem)] pb-8 sm:min-h-[calc(100vh-25rem)] lg:min-h-[calc(100vh-18rem)]">
      <SectionHeading
        eyebrow="Compare"
        title="Compare saved products"
        description="Review specifications, pricing, and ratings for up to four products before you request a quotation."
      />

      {!items.length ? (
        <Card className="mt-8 rounded-3xl p-8 text-center text-sm text-gray-400">
          Add at least two products from the catalog to compare them here.
        </Card>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-400">{products.data?.data.length ?? items.length} products in your comparison list.</p>
            <Button variant="secondary" onClick={clearCompare}>
              Clear Compare
            </Button>
          </div>
          <div className="mt-6">
            <ProductComparisonGrid products={products.data?.data ?? []} onRemove={toggleCompare} />
          </div>
        </>
      )}
    </div>
  );
};
