import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type TouchEvent } from 'react';
import type { BannerAdSlotDto, BannerFeaturePromoDto } from '@njstore/types';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCarouselTimer } from '../../hooks/useCarouselTimer';
import { ProgressiveImage } from '../media/ProgressiveImage';
import { RevealSection } from './RevealSection';
import '../../styles/home-ads.css';

const AD_SLOT_ROTATION_MS = 4200;
const AD_SLOT_SWIPE_THRESHOLD_PX = 42;
const AD_SLOT_CLICK_SUPPRESSION_MS = 320;

type AdSlotMediaDirection = 'left' | 'right';

type AdSlotSwipeState = {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
};

export type HomeMediaSlot = Pick<BannerAdSlotDto | BannerFeaturePromoDto, 'mediaItems'>;

export type AdSlotImagePresentation = {
  fit: 'cover' | 'contain';
  style?: CSSProperties;
};

interface AdSlotGridProps {
  slots?: BannerAdSlotDto[];
}

export const getAdSlotMediaItems = (slot: HomeMediaSlot | undefined) => slot?.mediaItems ?? [];

const getAdSlotImagePresentationKey = (slotKey: string, mediaPublicId: string): string => `${slotKey}::${mediaPublicId}`;

const resolveAdSlotImagePresentation = (imageElement: HTMLImageElement): AdSlotImagePresentation => {
  const frameRect = imageElement.parentElement?.getBoundingClientRect();
  const naturalWidth = imageElement.naturalWidth;
  const naturalHeight = imageElement.naturalHeight;

  if (!frameRect || !naturalWidth || !naturalHeight) {
    return { fit: 'cover' };
  }

  const frameWidth = Math.max(frameRect.width, 1);
  const frameHeight = Math.max(frameRect.height, 1);
  const shouldPreserveNativeSize = naturalWidth < frameWidth * 1.05 || naturalHeight < frameHeight * 1.05;

  if (!shouldPreserveNativeSize) {
    return { fit: 'cover' };
  }

  return {
    fit: 'contain',
    style: {
      maxWidth: `${naturalWidth}px`,
      maxHeight: `${naturalHeight}px`
    }
  };
};

const isSameAdSlotImagePresentation = (
  current: AdSlotImagePresentation | undefined,
  next: AdSlotImagePresentation
): boolean =>
  current?.fit === next.fit &&
  current?.style?.maxWidth === next.style?.maxWidth &&
  current?.style?.maxHeight === next.style?.maxHeight;

export const AdSlotGrid = ({ slots }: AdSlotGridProps): JSX.Element | null => {
  const { t } = useTranslation();
  const visibleSlots = useMemo(
    () =>
      (slots ?? [])
        .filter((slot) => slot.isActive && (slot.title.trim() || slot.description?.trim() || getAdSlotMediaItems(slot).length))
        .slice(0, 3),
    [slots]
  );
  const [mediaIndexes, setMediaIndexes] = useState<Record<string, number>>({});
  const [mediaDirections, setMediaDirections] = useState<Record<string, AdSlotMediaDirection>>({});
  const [imagePresentations, setImagePresentations] = useState<Record<string, AdSlotImagePresentation>>({});
  const adSlotGridRef = useRef<HTMLDivElement>(null);
  const swipeStateRef = useRef<Record<string, AdSlotSwipeState | undefined>>({});
  const suppressClickRef = useRef<Record<string, true | undefined>>({});

  useEffect(() => {
    setMediaIndexes((current) => {
      const next: Record<string, number> = {};

      visibleSlots.forEach((slot) => {
        const mediaItems = getAdSlotMediaItems(slot);
        if (!mediaItems.length) {
          next[slot.slotKey] = 0;
          return;
        }

        next[slot.slotKey] = (current[slot.slotKey] ?? 0) % mediaItems.length;
      });

      return next;
    });
  }, [visibleSlots]);

  const rotatingSlots = useMemo(() => visibleSlots.filter((slot) => getAdSlotMediaItems(slot).length > 1), [visibleSlots]);

  const moveSlotMedia = useCallback((slotKey: string, mediaCount: number, direction: AdSlotMediaDirection): void => {
    if (mediaCount <= 1) {
      return;
    }

    setMediaDirections((current) => ({ ...current, [slotKey]: direction }));
    setMediaIndexes((current) => ({
      ...current,
      [slotKey]:
        direction === 'left'
          ? ((current[slotKey] ?? 0) - 1 + mediaCount) % mediaCount
          : ((current[slotKey] ?? 0) + 1) % mediaCount
    }));
  }, []);

  useCarouselTimer({
    delay: AD_SLOT_ROTATION_MS,
    enabled: rotatingSlots.length > 0,
    activeElementRef: adSlotGridRef,
    allowCoarsePointer: true,
    allowLowMemory: true,
    onTick: () => {
      setMediaDirections((current) => {
        const next = { ...current };
        rotatingSlots.forEach((slot) => {
          next[slot.slotKey] = 'right';
        });
        return next;
      });
      setMediaIndexes((current) => {
        const next = { ...current };

        rotatingSlots.forEach((slot) => {
          const mediaItems = getAdSlotMediaItems(slot);
          next[slot.slotKey] = ((current[slot.slotKey] ?? 0) + 1) % mediaItems.length;
        });

        return next;
      });
    }
  });

  const handleSlotTouchStart = (slotKey: string, event: TouchEvent<HTMLElement>): void => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    swipeStateRef.current[slotKey] = {
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY
    };
  };

  const handleSlotTouchMove = (slotKey: string, event: TouchEvent<HTMLElement>): void => {
    const swipeState = swipeStateRef.current[slotKey];
    const touch = event.touches[0];
    if (!swipeState || !touch) {
      return;
    }

    swipeState.lastX = touch.clientX;
    swipeState.lastY = touch.clientY;
  };

  const handleSlotTouchEnd = (slotKey: string, mediaCount: number, event: TouchEvent<HTMLElement>): void => {
    const swipeState = swipeStateRef.current[slotKey];
    swipeStateRef.current[slotKey] = undefined;

    if (!swipeState || mediaCount <= 1) {
      return;
    }

    const deltaX = swipeState.lastX - swipeState.startX;
    const deltaY = swipeState.lastY - swipeState.startY;
    const isHorizontalSwipe = Math.abs(deltaX) >= AD_SLOT_SWIPE_THRESHOLD_PX && Math.abs(deltaX) > Math.abs(deltaY) * 1.35;

    if (!isHorizontalSwipe) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current[slotKey] = true;
    window.setTimeout(() => {
      suppressClickRef.current[slotKey] = undefined;
    }, AD_SLOT_CLICK_SUPPRESSION_MS);

    moveSlotMedia(slotKey, mediaCount, deltaX > 0 ? 'left' : 'right');
  };

  const handleSlotClickCapture = (slotKey: string, event: MouseEvent<HTMLElement>): void => {
    if (!suppressClickRef.current[slotKey]) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current[slotKey] = undefined;
  };

  if (!visibleSlots.length) {
    return null;
  }

  return (
    <RevealSection className="page-shell py-6 sm:py-8 lg:py-10">
      <div ref={adSlotGridRef} className="grid gap-3.5 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleSlots.map((slot, index) => {
          const fallbackIndex = index + 1;
          const cardTitle = slot.title.trim() || t('home.adSlots.fallbackTitle', { index: fallbackIndex });
          const mediaItems = getAdSlotMediaItems(slot);
          const activeMediaIndex = mediaIndexes[slot.slotKey] ?? 0;
          const activeMedia = mediaItems[activeMediaIndex] ?? mediaItems[0];
          const activeMediaPresentationKey = activeMedia ? getAdSlotImagePresentationKey(slot.slotKey, activeMedia.publicId) : undefined;
          const activeMediaPresentation = activeMediaPresentationKey ? imagePresentations[activeMediaPresentationKey] : undefined;
          const activeMediaClassName = activeMediaPresentation?.fit === 'contain' ? 'home-ad-card__media--contain' : 'home-ad-card__media--cover';
          const slotHref = slot.ctaUrl?.trim();
          const mediaDirection = mediaDirections[slot.slotKey] ?? 'right';

          const cardContent = (
            <>
              {activeMedia ? (
                <div className="home-ad-card__media-frame">
                  <div
                    key={`${activeMedia.publicId}-${activeMediaIndex}`}
                    className={`home-ad-card__media-shell promo-media-enter ${
                      mediaDirection === 'left' ? 'promo-media-enter-left' : 'promo-media-enter-right'
                    }`}
                  >
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
                      <ProgressiveImage
                        src={activeMedia.url}
                        alt={activeMedia.alt ?? cardTitle}
                        loading="lazy"
                        decoding="async"
                        className={`home-ad-card__media ${activeMediaClassName}`}
                        style={activeMediaPresentation?.style}
                        onLoad={(event) => {
                          const nextPresentation = resolveAdSlotImagePresentation(event.currentTarget);

                          if (
                            activeMediaPresentationKey &&
                            !isSameAdSlotImagePresentation(activeMediaPresentation, nextPresentation)
                          ) {
                            setImagePresentations((current) => ({
                              ...current,
                              [activeMediaPresentationKey]: nextPresentation
                            }));
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              ) : null}
              <div className="home-ad-card__overlay" />
              <div className="home-ad-card__content">
                <div>
                  <div className="home-ad-card__meta-row">
                    <p className="home-ad-card__eyebrow">
                      {slot.eyebrow?.trim() || t('home.adSlots.fallbackEyebrow', { index: fallbackIndex })}
                    </p>
                    {mediaItems.length > 1 ? (
                      <div className="flex items-center gap-1.5">
                        {mediaItems.map((media, mediaIndex) => (
                          <span
                            key={media.publicId}
                            className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 ${
                              mediaIndex === activeMediaIndex ? 'bg-gold' : 'bg-white/30'
                            }`}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <h3 className="home-ad-card__title">{cardTitle}</h3>
                  {slot.description ? <p className="home-ad-card__description">{slot.description}</p> : null}
                </div>
              </div>
            </>
          );

          return slotHref ? (
            <Link
              key={slot.slotKey}
              to={slotHref}
              className="home-ad-card home-ad-card--clickable group"
              aria-label={t('home.adSlots.openAd', { title: cardTitle })}
              onClickCapture={(event) => handleSlotClickCapture(slot.slotKey, event)}
              onTouchStart={(event) => handleSlotTouchStart(slot.slotKey, event)}
              onTouchMove={(event) => handleSlotTouchMove(slot.slotKey, event)}
              onTouchEnd={(event) => handleSlotTouchEnd(slot.slotKey, mediaItems.length, event)}
            >
              {cardContent}
            </Link>
          ) : (
            <div
              key={slot.slotKey}
              className="home-ad-card group"
              onTouchStart={(event) => handleSlotTouchStart(slot.slotKey, event)}
              onTouchMove={(event) => handleSlotTouchMove(slot.slotKey, event)}
              onTouchEnd={(event) => handleSlotTouchEnd(slot.slotKey, mediaItems.length, event)}
            >
              {cardContent}
            </div>
          );
        })}
      </div>
    </RevealSection>
  );
};
