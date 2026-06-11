import type { CSSProperties } from 'react';
import type { BannerShowcaseFeatureItemDto, HomeAdSlotKey, ProductSuggestionDto } from '@njstore/types';
import { Badge, Button, Modal } from '@njstore/ui';
import {
  ArrowRight,
  BatteryCharging,
  Camera,
  Cpu,
  HardDrive,
  MemoryStick,
  MonitorSmartphone,
  Recycle,
  RefreshCw,
  ShieldCheck,
  Speaker,
  Sparkles,
  Star,
  Truck,
  Wifi
} from 'lucide-react';
import {
  hasMediaItemContent,
  slotKeys,
  type EditorSectionKey,
  type HomeBannerFormValues
} from './homeBannerFormModel';

interface HomeBannerPreviewModalProps {
  section: EditorSectionKey | null;
  onClose: () => void;
  preview: HomeBannerFormValues;
  selectedHeroSpotlightProduct: ProductSuggestionDto | null;
  selectedShowcaseProducts: ProductSuggestionDto[];
  showcaseFeatureGroups: Record<string, BannerShowcaseFeatureItemDto[]>;
  previewHeroCornerImageUrl: string;
  previewHeroCornerImageEnabled: boolean;
  previewHeroCornerImageSize: number;
  previewHeroBottomLeftImageUrl: string;
  previewHeroBottomLeftImageEnabled: boolean;
  previewHeroBottomLeftImageSize: number;
  previewHeroBottomRightImageUrl: string;
  previewHeroBottomRightImageEnabled: boolean;
  previewHeroBottomRightImageSize: number;
}

type MediaItem = HomeBannerFormValues['adSlots'][number]['mediaItems'][number];

const sectionLabels: Record<EditorSectionKey, string> = {
  hero: 'Hero',
  'hero-spotlight': 'Hero Spotlight',
  'slot-1': 'Advertisement Place 1',
  'slot-2': 'Advertisement Place 2',
  'slot-3': 'Advertisement Place 3',
  'feature-promo': 'Mid-page Promo',
  showcase: 'Curated Showcase'
};

const showcaseFeatureIcons = {
  camera: Camera,
  memory: MemoryStick,
  storage: HardDrive,
  battery: BatteryCharging,
  display: MonitorSmartphone,
  chip: Cpu,
  audio: Speaker,
  connectivity: Wifi
} as const;

const formatCurrency = (amount: number): string => `LKR ${amount.toLocaleString()}`;

const getPreviewMediaItems = (items: MediaItem[] = []): MediaItem[] =>
  items.filter((item) => hasMediaItemContent(item) && item.url.trim().length > 0);

const getHeroSurfaceStyle = (preview: HomeBannerFormValues): CSSProperties => ({
  backgroundImage: preview.imageUrl.trim()
    ? `linear-gradient(140deg, rgba(7, 14, 27, 0.88), rgba(7, 14, 27, 0.68)), url(${preview.imageUrl.trim()})`
    : 'linear-gradient(145deg, rgba(5, 12, 28, 1), rgba(8, 18, 38, 1) 58%, rgba(7, 12, 22, 1))',
  backgroundSize: 'cover',
  backgroundPosition: 'center'
});

const CornerBadge = ({
  url,
  alt,
  size,
  className
}: {
  url: string;
  alt: string;
  size: number;
  className: string;
}): JSX.Element => (
  <img
    src={url}
    alt={alt}
    className={`absolute z-[3] h-auto w-auto object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.24)] ${className}`}
    loading="lazy"
    decoding="async"
    style={{ width: size, maxWidth: size, maxHeight: size }}
  />
);

const EmptyPreviewState = ({ text }: { text: string }): JSX.Element => (
  <div className="rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.03] px-5 py-8 text-center text-sm text-gray-400">
    {text}
  </div>
);

const HeroPreview = ({ preview }: { preview: HomeBannerFormValues }): JSX.Element => (
  <div className="mx-auto max-w-6xl">
    <div className="rounded-[1.5rem] border border-white/[0.05] bg-white/[0.02] p-3 shadow-[0_22px_48px_rgba(3,10,26,0.18)]">
      <div
        className="relative isolate overflow-hidden rounded-[1.35rem] border border-[rgba(255,255,255,0.1)] p-4 shadow-[0_20px_44px_rgba(0,0,0,0.22)]"
        style={getHeroSurfaceStyle(preview)}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.14),transparent_24%),radial-gradient(circle_at_68%_36%,rgba(255,255,255,0.08),transparent_18%),linear-gradient(104deg,rgba(7,14,27,0.9)_0%,rgba(7,14,27,0.8)_38%,rgba(7,14,27,0.42)_68%,rgba(7,14,27,0.22)_100%)]" />
        <div className="relative z-[1] grid min-h-[21rem] gap-4 lg:grid-rows-[minmax(0,1fr)_auto]">
          <div className="max-w-[30rem] p-3">
            <div className="inline-flex max-w-max items-center gap-2.5 rounded-full border border-gold/20 bg-[linear-gradient(135deg,rgba(212,175,55,0.16),rgba(212,175,55,0.06))] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-gold shadow-[0_10px_24px_rgba(212,175,55,0.12)]">
              <Sparkles className="h-3.5 w-3.5" />
              {preview.campaignLabel || 'NJ Store'}
            </div>
            <h1 className="mt-5 max-w-[24.5rem] font-display text-[2.35rem] leading-[0.92] text-[rgba(255,255,255,0.98)] drop-shadow-[0_3px_14px_rgba(2,6,23,0.42)]">
              {preview.title || 'Your hero headline preview will appear here.'}
            </h1>
            <p className="mt-3 line-clamp-2 max-w-[24.5rem] text-[13.5px] leading-6 text-[rgba(232,238,247,0.88)] drop-shadow-[0_2px_10px_rgba(2,6,23,0.34)]">
              {preview.subtitle || 'Add supporting copy to see the storefront hero layout.'}
            </p>
            <div className="mt-5 grid max-w-[24.5rem] grid-cols-2 gap-2.5">
              <Button type="button" size="sm" className="h-11 justify-center rounded-full px-4 text-[13px]">
                {preview.ctaText || 'Shop Collection'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-11 justify-center rounded-full border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.05)] px-4 text-[13px] text-[rgba(255,255,255,0.94)]"
              >
                Shop Used Items
              </Button>
            </div>
            <div className="mt-5 grid max-w-[25rem] grid-cols-2 gap-2.5">
              {[
                {
                  icon: ShieldCheck,
                  label: preview.accentText?.trim() || 'Official warranty on curated devices'
                },
                { icon: Recycle, label: 'Quality used devices' }
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex min-h-[4.5rem] items-center gap-3 rounded-[1rem] border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))] px-3.5 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.12)]"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/18 bg-gold/10 text-gold">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="line-clamp-2 text-[11px] font-medium leading-5 text-[rgba(240,244,250,0.86)]">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: ShieldCheck, label: 'Official stock', detail: 'Brand-backed warranty on curated devices.' },
              { icon: Truck, label: 'Islandwide delivery', detail: 'Fast dispatch to major cities and islandwide routes.' },
              { icon: RefreshCw, label: 'Quote-first checkout', detail: 'Get pricing guidance before you commit to the order.' }
            ].map(({ icon: Icon, label, detail }) => (
              <div key={label} className="rounded-[1rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(7,14,27,0.24)] p-2.5 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/14 text-gold">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="line-clamp-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[rgba(232,238,247,0.68)]">{label}</p>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-[rgba(255,255,255,0.82)]">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const HeroSpotlightPreview = ({
  preview,
  selectedHeroSpotlightProduct,
  previewHeroCornerImageUrl,
  previewHeroCornerImageEnabled,
  previewHeroCornerImageSize,
  previewHeroBottomLeftImageUrl,
  previewHeroBottomLeftImageEnabled,
  previewHeroBottomLeftImageSize,
  previewHeroBottomRightImageUrl,
  previewHeroBottomRightImageEnabled,
  previewHeroBottomRightImageSize
}: Pick<
  HomeBannerPreviewModalProps,
  | 'preview'
  | 'selectedHeroSpotlightProduct'
  | 'previewHeroCornerImageUrl'
  | 'previewHeroCornerImageEnabled'
  | 'previewHeroCornerImageSize'
  | 'previewHeroBottomLeftImageUrl'
  | 'previewHeroBottomLeftImageEnabled'
  | 'previewHeroBottomLeftImageSize'
  | 'previewHeroBottomRightImageUrl'
  | 'previewHeroBottomRightImageEnabled'
  | 'previewHeroBottomRightImageSize'
>): JSX.Element => {
  const productImage = selectedHeroSpotlightProduct?.thumbnail?.url;

  return (
    <div className="mx-auto max-w-[30rem]">
      <div className="group relative flex min-h-[26rem] items-center justify-center overflow-hidden rounded-[1.45rem] border border-[rgba(255,255,255,0.12)] bg-[radial-gradient(circle_at_50%_24%,rgba(255,255,255,0.14),rgba(255,255,255,0.04)_54%,rgba(255,255,255,0)_76%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(7,14,27,0.1))] p-3.5 shadow-[0_20px_42px_rgba(0,0,0,0.16)] backdrop-blur-md">
        <div className="pointer-events-none absolute inset-x-[18%] top-[18%] h-24 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-[20%] bottom-[22%] h-20 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute left-4 top-4 z-[3] max-w-[13rem] rounded-[1rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(7,14,27,0.3)] px-3 py-2 backdrop-blur-md">
          <p className="line-clamp-2 font-display text-[1rem] leading-tight text-[rgba(255,255,255,0.96)]">
            {selectedHeroSpotlightProduct?.name ?? 'Select a hero spotlight product'}
          </p>
        </div>
        {previewHeroCornerImageUrl && previewHeroCornerImageEnabled ? (
          <CornerBadge
            url={previewHeroCornerImageUrl}
            alt={preview.heroCornerImageAlt?.trim() || 'Top right hero badge'}
            size={previewHeroCornerImageSize}
            className="right-4 top-4"
          />
        ) : null}
        {previewHeroBottomLeftImageUrl && previewHeroBottomLeftImageEnabled ? (
          <CornerBadge
            url={previewHeroBottomLeftImageUrl}
            alt={preview.heroBottomLeftImageAlt?.trim() || 'Bottom left hero badge'}
            size={previewHeroBottomLeftImageSize}
            className="bottom-4 left-4"
          />
        ) : null}
        {previewHeroBottomRightImageUrl && previewHeroBottomRightImageEnabled ? (
          <CornerBadge
            url={previewHeroBottomRightImageUrl}
            alt={preview.heroBottomRightImageAlt?.trim() || 'Bottom right hero badge'}
            size={previewHeroBottomRightImageSize}
            className="bottom-4 right-4"
          />
        ) : null}
        <div className="relative z-[1] flex h-[15.5rem] w-[15.5rem] items-center justify-center">
          {productImage ? (
            <img
              src={productImage}
              alt={selectedHeroSpotlightProduct?.name ?? 'Featured product'}
              className="h-full w-full object-contain object-center drop-shadow-[0_30px_48px_rgba(0,0,0,0.42)]"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-[2rem] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] text-gold shadow-[0_24px_40px_rgba(0,0,0,0.24)]">
              <Sparkles className="h-14 w-14" />
            </div>
          )}
        </div>
        {selectedHeroSpotlightProduct ? (
          <div className="absolute bottom-5 left-1/2 z-[3] -translate-x-1/2 rounded-full border border-gold/25 bg-[rgba(7,14,27,0.34)] px-3 py-2 backdrop-blur-md">
            <span className="font-mono text-[0.96rem] text-gold">{formatCurrency(selectedHeroSpotlightProduct.price)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const AdSlotPreview = ({
  slot,
  index
}: {
  slot: HomeBannerFormValues['adSlots'][number];
  index: number;
}): JSX.Element => {
  const mediaItems = getPreviewMediaItems(slot.mediaItems);
  const activeMedia = mediaItems[0];
  const cardTitle = slot.title?.trim() || `Advertisement place ${index + 1}`;

  return (
    <div className="mx-auto grid w-full max-w-[32rem]">
      <div className="home-ad-card group">
        {activeMedia ? (
          <div className="home-ad-card__media-frame">
            {activeMedia.kind === 'video' ? (
              <video
                src={activeMedia.url}
                className="home-ad-card__media home-ad-card__media--cover"
                muted
                autoPlay
                loop
                playsInline
                preload="metadata"
              />
            ) : (
              <img src={activeMedia.url} alt={activeMedia.alt?.trim() || cardTitle} className="home-ad-card__media home-ad-card__media--cover" loading="lazy" decoding="async" />
            )}
          </div>
        ) : null}
        <div className="home-ad-card__overlay" />
        <div className="home-ad-card__content">
          <div>
            <div className="home-ad-card__meta-row">
              <p className="home-ad-card__eyebrow">{slot.eyebrow?.trim() || `Advertisement ${index + 1}`}</p>
              {mediaItems.length > 1 ? (
                <div className="flex items-center gap-1.5">
                  {mediaItems.map((media, mediaIndex) => (
                    <span
                      key={`${media.publicId || media.url}-${mediaIndex}`}
                      className={`h-1.5 w-1.5 rounded-full ${mediaIndex === 0 ? 'bg-gold' : 'bg-white/30'}`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              ) : null}
            </div>
            <h3 className="home-ad-card__title">{cardTitle}</h3>
            {slot.description?.trim() ? <p className="home-ad-card__description">{slot.description.trim()}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const FeaturePromoPreview = ({ preview }: { preview: HomeBannerFormValues }): JSX.Element => {
  const mediaItems = getPreviewMediaItems(preview.featurePromo.mediaItems);
  const activeMedia = mediaItems[0];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="relative isolate overflow-hidden rounded-[2rem] border border-slate-200/90 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_48%,#f1f5f9_100%)] text-slate-900 shadow-[0_28px_60px_rgba(15,23,42,0.08)]">
        <div className="pointer-events-none absolute inset-y-0 left-[34%] hidden w-px bg-[linear-gradient(180deg,transparent,rgba(148,163,184,0.38),transparent)] lg:block" />
        <div className={`relative grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:px-10 ${activeMedia ? 'lg:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.3fr)] lg:items-center' : ''}`}>
          <div className="relative z-[1] flex flex-col justify-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{preview.featurePromo.eyebrow?.trim() || 'Feature Promo'}</p>
            <h2 className="mt-3 max-w-[17rem] font-display text-[2.75rem] leading-[0.96] text-slate-950 lg:text-[3.05rem]">
              {preview.featurePromo.title?.trim() || 'Showcase a new campaign here'}
            </h2>
            {preview.featurePromo.description?.trim() ? (
              <p className="mt-4 max-w-[18rem] text-base leading-7 text-slate-600">{preview.featurePromo.description.trim()}</p>
            ) : null}
            <div className="mt-7 flex flex-wrap items-center gap-4">
              {preview.featurePromo.ctaText?.trim() ? (
                <span className="inline-flex items-center gap-2 border-b border-slate-900 pb-1.5 text-sm font-semibold text-slate-900">
                  {preview.featurePromo.ctaText.trim()}
                  <ArrowRight className="h-4 w-4" />
                </span>
              ) : null}
              {preview.featurePromo.secondaryCtaText?.trim() ? (
                <span className="inline-flex h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 shadow-[0_10px_22px_rgba(15,23,42,0.08)]">
                  {preview.featurePromo.secondaryCtaText.trim()}
                </span>
              ) : null}
            </div>
          </div>
          {activeMedia ? (
            <div className="relative z-[1] flex min-h-[21rem] items-center justify-center py-6">
              <div className="relative mx-auto flex h-[20rem] w-full max-w-[39rem] items-center justify-center">
                {activeMedia.kind === 'video' ? (
                  <video
                    src={activeMedia.url}
                    className="h-auto max-h-full w-auto max-w-full rounded-[1.35rem] object-contain object-center shadow-[0_20px_42px_rgba(15,23,42,0.14)]"
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={activeMedia.url}
                    alt={activeMedia.alt?.trim() || preview.featurePromo.title?.trim() || 'Home promo media'}
                    className="h-auto max-h-full w-auto max-w-full object-contain object-center drop-shadow-[0_22px_32px_rgba(15,23,42,0.12)]"
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const ShowcasePreview = ({
  selectedShowcaseProducts,
  showcaseFeatureGroups
}: Pick<HomeBannerPreviewModalProps, 'selectedShowcaseProducts' | 'showcaseFeatureGroups'>): JSX.Element => {
  const product = selectedShowcaseProducts[0];
  const featureItems = product ? showcaseFeatureGroups[product.id] ?? [] : [];

  if (!product) {
    return <EmptyPreviewState text="Select at least one product to preview the storefront showcase card." />;
  }

  return (
    <div className="mx-auto max-w-[30rem]">
      <div className="overflow-hidden rounded-[1.35rem] border border-white/78 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,252,245,0.98)_56%,rgba(247,250,252,1)_100%)] p-4 text-slate-900 shadow-[0_18px_38px_rgba(15,23,42,0.06)]">
        <div className="grid gap-3">
          <div className="relative flex min-h-[17rem] items-center justify-center overflow-hidden rounded-[1.25rem] bg-[radial-gradient(circle_at_50%_36%,rgba(255,255,255,0.92),rgba(226,232,240,0.46)_62%,rgba(248,250,252,0)_78%)]">
            <span className="absolute left-3 top-3 rounded-[0.9rem] border border-white/70 bg-white/85 px-3 py-1 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-slate-600 shadow-[0_7px_16px_rgba(15,23,42,0.06)]">
              Curated
            </span>
            {product.thumbnail?.url ? (
              <img
                src={product.thumbnail.url}
                alt={product.thumbnail.alt ?? product.name}
                className="h-[13.5rem] w-[13.5rem] object-contain object-center drop-shadow-[0_24px_38px_rgba(2,6,23,0.18)]"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <Sparkles className="h-16 w-16 text-slate-300" />
            )}
          </div>
          {featureItems.length ? (
            <div className="rounded-[1.3rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.64),rgba(248,250,252,0.88))] px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_14px_28px_rgba(15,23,42,0.03)]">
              {featureItems.map((item, index) => {
                const Icon = showcaseFeatureIcons[item.icon] ?? Sparkles;

                return (
                  <div key={`${item.icon}-${item.label}-${item.value}`} className={`${index > 0 ? 'mt-2.5 border-t border-slate-200/75 pt-2.5' : ''} flex items-start gap-2.5`}>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[0.95rem] bg-gold/12 text-gold">
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[0.56rem] uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                      <p className="mt-1 truncate text-[0.8rem] font-semibold leading-[1.12] text-slate-800">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="border-t border-slate-200/70 pt-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <div className="min-w-0">
                <h2 className="line-clamp-2 font-display text-[1.12rem] leading-[1.12] text-slate-900">{product.name}</h2>
                <p className="mt-1 line-clamp-2 text-[0.66rem] leading-[0.95rem] text-slate-500">Freshly curated storefront product.</p>
              </div>
              <span className="font-mono text-[1rem] leading-none text-gold">{formatCurrency(product.price)}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-0 rounded-[1.2rem] border border-white/78 bg-[linear-gradient(180deg,rgba(255,255,255,0.64),rgba(248,250,252,0.86))] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              {[
                { icon: ShieldCheck, label: 'Official warranty' },
                { icon: Star, label: 'Store pick' },
                { icon: Truck, label: 'Islandwide delivery' }
              ].map(({ icon: Icon, label }, index) => (
                <span
                  key={label}
                  className={`${index > 0 ? 'border-l border-slate-200/75 pl-3' : ''} inline-flex min-h-[2rem] items-center justify-center gap-2 px-2 py-1.5 text-[0.66rem] leading-[0.9rem] text-slate-600`}
                >
                  <Icon className="h-3 w-3 text-gold" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const renderPreview = (props: HomeBannerPreviewModalProps): JSX.Element => {
  const { section, preview } = props;

  if (section === 'hero') {
    return <HeroPreview preview={preview} />;
  }

  if (section === 'hero-spotlight') {
    return <HeroSpotlightPreview {...props} selectedHeroSpotlightProduct={props.selectedHeroSpotlightProduct} />;
  }

  if (section === 'feature-promo') {
    return <FeaturePromoPreview preview={preview} />;
  }

  if (section === 'showcase') {
    return <ShowcasePreview selectedShowcaseProducts={props.selectedShowcaseProducts} showcaseFeatureGroups={props.showcaseFeatureGroups} />;
  }

  if (section && slotKeys.includes(section as HomeAdSlotKey)) {
    const index = slotKeys.indexOf(section as HomeAdSlotKey);
    return <AdSlotPreview slot={preview.adSlots[index]} index={index} />;
  }

  return <EmptyPreviewState text="Choose a section to preview." />;
};

export const HomeBannerPreviewModal = (props: HomeBannerPreviewModalProps): JSX.Element => {
  const { section, onClose, preview } = props;
  const title = section ? `${sectionLabels[section]} Preview` : 'Preview';

  return (
    <Modal
      isOpen={Boolean(section)}
      onClose={onClose}
      title={title}
      size="full"
      contentClassName="border border-white/10 bg-[#050b14]"
      bodyClassName="max-h-[calc(100vh-8rem)] overflow-y-auto bg-[#050b14] p-4 sm:p-6"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="default" className="bg-white/[0.06] text-gray-300">
            {preview.isActive ? 'Published campaign' : 'Draft campaign'}
          </Badge>
          {section ? (
            <Badge variant="default" className="bg-gold/10 text-gold">
              {sectionLabels[section]}
            </Badge>
          ) : null}
        </div>
        {renderPreview(props)}
      </div>
    </Modal>
  );
};
