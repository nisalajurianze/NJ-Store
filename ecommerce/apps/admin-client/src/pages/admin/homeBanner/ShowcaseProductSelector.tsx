import { Badge, Button, Input } from '@njstore/ui';
import type { BannerShowcaseFeatureItemDto, ProductSuggestionDto } from '@njstore/types';
import { CampaignEditorSection } from './CampaignEditorSection';
import { showcaseFeatureIconOptions } from './homeBannerFormModel';

interface ShowcaseProductSelectorProps {
  canWriteBanner: boolean;
  isBootstrapping: boolean;
  isSaving: boolean;
  showcaseSearch: string;
  onShowcaseSearchChange: (value: string) => void;
  showcaseSuggestionsPending: boolean;
  showcaseSuggestions: ProductSuggestionDto[];
  selectedShowcaseProducts: ProductSuggestionDto[];
  onAddShowcaseProduct: (product: ProductSuggestionDto) => void;
  onRemoveShowcaseProduct: (productId: string) => void;
  onMoveShowcaseProduct: (productId: string, direction: 'left' | 'right') => void;
  showcaseFeatureGroups: Record<string, BannerShowcaseFeatureItemDto[]>;
  onAddShowcaseFeatureItem: (productId: string) => void;
  onUpdateShowcaseFeatureItem: (
    productId: string,
    index: number,
    field: keyof BannerShowcaseFeatureItemDto,
    value: string
  ) => void;
  onRemoveShowcaseFeatureItem: (productId: string, index: number) => void;
  onSave: () => Promise<void>;
}

export const ShowcaseProductSelector = ({
  canWriteBanner,
  isBootstrapping,
  isSaving,
  showcaseSearch,
  onShowcaseSearchChange,
  showcaseSuggestionsPending,
  showcaseSuggestions,
  selectedShowcaseProducts,
  onAddShowcaseProduct,
  onRemoveShowcaseProduct,
  onMoveShowcaseProduct,
  showcaseFeatureGroups,
  onAddShowcaseFeatureItem,
  onUpdateShowcaseFeatureItem,
  onRemoveShowcaseFeatureItem,
  onSave
}: ShowcaseProductSelectorProps): JSX.Element => (
  <CampaignEditorSection
    eyebrow="Curated Showcase"
    title="Select Rotating Products"
    description="Choose the products that appear one-by-one in the last block. Their order here becomes the direction order on the storefront, separate from the hero spotlight product."
    summary={
      selectedShowcaseProducts.length
        ? `${selectedShowcaseProducts.length} product(s) selected. ${selectedShowcaseProducts[0]?.name ?? 'The first product'} will show first.`
        : 'No products selected yet for the right-side rotating block.'
    }
    action={
      canWriteBanner ? (
        <Button type="button" size="sm" disabled={isBootstrapping} isLoading={isSaving} onClick={() => void onSave()}>
          Save Showcase
        </Button>
      ) : undefined
    }
  >
    <div className="space-y-4">
      <Input
        label="Find Products"
        placeholder="Search by product name or brand"
        value={showcaseSearch}
        onChange={(event) => onShowcaseSearchChange(event.target.value)}
      />

      {showcaseSearch.trim().length >= 2 ? (
        <div className="rounded-[20px] border border-white/10 bg-[#081224]/80 p-3">
          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-gray-400">Search Results</p>
          <div className="space-y-2">
            {showcaseSuggestionsPending ? (
              <p className="text-sm text-gray-400">Searching products…</p>
            ) : showcaseSuggestions.length ? (
              showcaseSuggestions.map((product) => {
                const alreadySelected = selectedShowcaseProducts.some((entry) => entry.id === product.id);

                return (
                  <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{product.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">LKR {product.price.toLocaleString()}</p>
                    </div>
                    <Button type="button" size="sm" variant={alreadySelected ? 'secondary' : 'primary'} disabled={alreadySelected} onClick={() => onAddShowcaseProduct(product)}>
                      {alreadySelected ? 'Added' : 'Add to Showcase'}
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-400">No matching products found for this search.</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="rounded-[20px] border border-white/10 bg-[#081224]/80 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Selected Products</p>
          <Badge variant="default" className="bg-white/[0.06] text-gray-300">
            {selectedShowcaseProducts.length}/8 selected
          </Badge>
        </div>
        <div className="space-y-2">
          {selectedShowcaseProducts.length ? (
            selectedShowcaseProducts.map((product, index) => (
              <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    {index + 1}. {product.name}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">LKR {product.price.toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" disabled={index === 0} onClick={() => onMoveShowcaseProduct(product.id, 'left')}>
                    Move Left
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={index === selectedShowcaseProducts.length - 1}
                    onClick={() => onMoveShowcaseProduct(product.id, 'right')}
                  >
                    Move Right
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => onRemoveShowcaseProduct(product.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">No showcase products selected yet. Add products from the search results above.</p>
          )}
        </div>
      </div>

      <div className="rounded-[20px] border border-white/10 bg-[#081224]/80 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Feature Highlights</p>
            <p className="mt-2 text-sm text-gray-400">Set the icon, label, and value rows shown beside each showcase product image on the storefront.</p>
          </div>
        </div>
        <div className="space-y-3">
          {selectedShowcaseProducts.length ? (
            selectedShowcaseProducts.map((product) => {
              const featureItems = showcaseFeatureGroups[product.id] ?? [];

              return (
                <div key={product.id} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{product.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">{featureItems.length}/4 feature rows</p>
                      <p className="mt-1 text-xs text-gray-400">All feature rows show as right-side cards in the showcase.</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={featureItems.length >= 4}
                      onClick={() => onAddShowcaseFeatureItem(product.id)}
                    >
                      Add Feature
                    </Button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {featureItems.length ? (
                      featureItems.map((item, index) => (
                        <div key={`${product.id}-${index}`} className="rounded-[18px] border border-white/10 bg-[#081224]/80 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-gold">Feature {index + 1}</p>
                            <Button type="button" size="sm" variant="secondary" onClick={() => onRemoveShowcaseFeatureItem(product.id, index)}>
                              Remove
                            </Button>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <div>
                              <label
                                htmlFor={`showcase-feature-icon-${product.id}-${index}`}
                                className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-400"
                              >
                                Icon
                              </label>
                              <select
                                id={`showcase-feature-icon-${product.id}-${index}`}
                                className="w-full rounded-2xl border border-white/10 bg-dark px-4 py-3 text-sm text-white shadow-[0_14px_30px_rgba(0,0,0,0.18)] outline-none transition-colors duration-200 focus:border-gold/40 focus:ring-2 focus:ring-gold/20"
                                value={item.icon}
                                onChange={(event) => onUpdateShowcaseFeatureItem(product.id, index, 'icon', event.target.value)}
                              >
                                {showcaseFeatureIconOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <Input
                              label="Feature Label"
                              placeholder="Camera"
                              value={item.label}
                              onChange={(event) => onUpdateShowcaseFeatureItem(product.id, index, 'label', event.target.value)}
                            />
                            <Input
                              label="Feature Value"
                              placeholder="48MP main"
                              value={item.value}
                              onChange={(event) => onUpdateShowcaseFeatureItem(product.id, index, 'value', event.target.value)}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400">No showcase features added for this product yet.</p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-400">Select showcase products first, then add the feature rows you want to show beside each image.</p>
          )}
        </div>
      </div>
    </div>
  </CampaignEditorSection>
);
