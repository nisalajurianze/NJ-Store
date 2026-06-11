import { useEffect, useMemo, useRef, useState } from 'react';
import type { BannerFeaturePromoDto } from '@njstore/types';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCarouselTimer } from '../../hooks/useCarouselTimer';
import { useFastMotionPreference } from '../../hooks/useFastMotionPreference';
import { MouseReactiveParticles } from '../effects/MouseReactiveParticles';
import { ProgressiveImage } from '../media/ProgressiveImage';
import { getAdSlotMediaItems } from './AdSlotGrid';
import { RevealSection } from './RevealSection';

const FEATURE_PROMO_ROTATION_MS = 4200;

interface FeaturePromoProps {
  promo?: BannerFeaturePromoDto;
}

export const FeaturePromo = ({ promo }: FeaturePromoProps): JSX.Element | null => {
  const mediaItems = useMemo(() => getAdSlotMediaItems(promo), [promo]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right');
  const featurePromoRef = useRef<HTMLDivElement>(null);
  const featurePromoVideoRef = useRef<HTMLVideoElement>(null);
  const fastMotion = useFastMotionPreference();

  const isVisible =
    Boolean(promo?.isActive) && Boolean(promo?.title?.trim() || promo?.description?.trim() || mediaItems.length);
  const [isFeaturePromoInView, setIsFeaturePromoInView] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(() => typeof document === 'undefined' || !document.hidden);

  useEffect(() => {
    if (!mediaItems.length) {
      if (activeMediaIndex !== 0) {
        setActiveMediaIndex(0);
      }
      return;
    }

    if (activeMediaIndex > mediaItems.length - 1) {
      setActiveMediaIndex(0);
    }
  }, [activeMediaIndex, mediaItems.length]);

  useCarouselTimer({
    delay: FEATURE_PROMO_ROTATION_MS,
    enabled: mediaItems.length > 1,
    activeElementRef: featurePromoRef,
    allowCoarsePointer: true,
    allowLowMemory: true,
    onTick: () => {
      setTransitionDirection('right');
      setActiveMediaIndex((current) => (current + 1) % mediaItems.length);
    }
  });

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const syncDocumentVisibility = (): void => {
      setIsDocumentVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', syncDocumentVisibility);
    return () => {
      document.removeEventListener('visibilitychange', syncDocumentVisibility);
    };
  }, []);

  useEffect(() => {
    const node = featurePromoRef.current;

    if (!isVisible || !node || typeof IntersectionObserver === 'undefined') {
      setIsFeaturePromoInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFeaturePromoInView(Boolean(entry?.isIntersecting));
      },
      { rootMargin: '160px 0px', threshold: 0.01 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [isVisible]);

  const activeMedia = mediaItems[activeMediaIndex] ?? mediaItems[0];

  useEffect(() => {
    const video = featurePromoVideoRef.current;
    if (!video || activeMedia?.kind !== 'video') {
      return;
    }

    if (!isFeaturePromoInView || !isDocumentVisible) {
      video.pause();
      return;
    }

    const playPromise = video.play();
    if (playPromise) {
      void playPromise.catch(() => undefined);
    }
  }, [activeMedia?.kind, activeMedia?.publicId, isDocumentVisible, isFeaturePromoInView]);

  if (!isVisible) {
    return null;
  }

  const mediaHref = promo?.ctaUrl?.trim() || promo?.secondaryCtaUrl?.trim() || undefined;
  const mediaLinkLabel = promo?.title?.trim() || promo?.eyebrow?.trim() || 'feature promo';

  const selectMedia = (nextIndex: number): void => {
    if (nextIndex < 0 || nextIndex >= mediaItems.length || nextIndex === activeMediaIndex) {
      return;
    }

    setTransitionDirection(nextIndex < activeMediaIndex ? 'left' : 'right');
    setActiveMediaIndex(nextIndex);
  };

  return (
    <RevealSection className="page-shell py-8 lg:py-10">
      <div ref={featurePromoRef} className="relative isolate overflow-hidden rounded-[2rem] border border-slate-200/90 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_48%,#f1f5f9_100%)] shadow-[0_28px_60px_rgba(15,23,42,0.08)]">
        <div className="pointer-events-none absolute inset-y-0 left-[34%] hidden w-px bg-[linear-gradient(180deg,transparent,rgba(148,163,184,0.38),transparent)] lg:block" />
        <div className="pointer-events-none absolute right-[-10%] top-[-18%] h-72 w-72 rounded-full bg-sky-100/55 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-28%] right-[14%] h-60 w-60 rounded-full bg-slate-200/45 blur-3xl" />
        {!fastMotion ? <MouseReactiveParticles particleCount={82} interactionStrength={0.92} className="z-0 opacity-95" /> : null}
        <div
          className={`relative grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:px-10 ${
            activeMedia ? 'lg:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.3fr)] lg:items-center' : ''
          }`}
        >
          <div className="relative z-[1] flex flex-col justify-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
              {promo?.eyebrow?.trim() || 'Feature Promo'}
            </p>
            <h2 className="mt-3 max-w-[14rem] font-display text-[2.25rem] leading-[0.96] text-slate-950 sm:max-w-[17rem] sm:text-[2.75rem] lg:text-[3.05rem]">
              {promo?.title?.trim() || 'Showcase a new campaign here'}
            </h2>
            {promo?.description?.trim() ? (
              <p className="mt-4 max-w-[18rem] text-base leading-7 text-slate-600">{promo.description.trim()}</p>
            ) : null}
            <div className="mt-7 flex flex-wrap items-center gap-4">
              {promo?.ctaText && promo.ctaUrl ? (
                <Link
                  to={promo.ctaUrl}
                  className="inline-flex items-center gap-2 border-b border-slate-900 pb-1.5 text-sm font-semibold text-slate-900 transition-colors duration-200 hover:text-slate-600"
                >
                  {promo.ctaText}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
              {promo?.secondaryCtaText && promo.secondaryCtaUrl ? (
                <Link
                  to={promo.secondaryCtaUrl}
                  className="inline-flex h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 shadow-[0_10px_22px_rgba(15,23,42,0.08)] transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-[0_14px_28px_rgba(15,23,42,0.12)]"
                >
                  {promo.secondaryCtaText}
                </Link>
              ) : null}
            </div>
          </div>

          {activeMedia ? (
            <div className="relative z-[1] flex min-h-[18rem] items-center justify-center py-4 sm:py-6 lg:min-h-[21rem]">
              <div className="pointer-events-none absolute inset-x-[18%] top-1/2 h-32 -translate-y-1/2 rounded-full bg-white/70 blur-3xl" />
              <div
                key={`${activeMedia.publicId}-${activeMediaIndex}`}
                className={`promo-media-enter ${
                  transitionDirection === 'left' ? 'promo-media-enter-left' : 'promo-media-enter-right'
                } relative mx-auto flex h-[13.5rem] w-full max-w-[20rem] items-center justify-center sm:h-[16rem] sm:max-w-[27rem] lg:h-[20rem] lg:max-w-[39rem] xl:h-[22rem] xl:max-w-[43rem]`}
              >
                {mediaHref ? (
                  <Link
                    to={mediaHref}
                    aria-label={`Open ${mediaLinkLabel}`}
                    className="group/promo-media flex h-full w-full cursor-pointer items-center justify-center transition-transform duration-300 ease-out hover:scale-[1.01]"
                  >
                    {activeMedia.kind === 'video' ? (
                      <video
                        ref={featurePromoVideoRef}
                        key={activeMedia.publicId}
                        src={activeMedia.url}
                        className="h-auto max-h-full w-auto max-w-full rounded-[1.35rem] object-contain object-center shadow-[0_20px_42px_rgba(15,23,42,0.14)] transition-transform duration-300 ease-out group-hover/promo-media:scale-[1.01]"
                        muted
                        autoPlay
                        loop
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <ProgressiveImage
                        key={activeMedia.publicId}
                        src={activeMedia.url}
                        alt={activeMedia.alt ?? promo?.title?.trim() ?? 'Home promo media'}
                        loading="lazy"
                        className="h-auto max-h-full w-auto max-w-full object-contain object-center drop-shadow-[0_22px_32px_rgba(15,23,42,0.12)] transition-transform duration-300 ease-out group-hover/promo-media:scale-[1.01]"
                      />
                    )}
                  </Link>
                ) : activeMedia.kind === 'video' ? (
                  <video
                    ref={featurePromoVideoRef}
                    key={activeMedia.publicId}
                    src={activeMedia.url}
                    className="h-auto max-h-full w-auto max-w-full rounded-[1.35rem] object-contain object-center shadow-[0_20px_42px_rgba(15,23,42,0.14)]"
                    muted
                    autoPlay
                    loop
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <ProgressiveImage
                    key={activeMedia.publicId}
                    src={activeMedia.url}
                    alt={activeMedia.alt ?? promo?.title?.trim() ?? 'Home promo media'}
                    loading="lazy"
                    className="h-auto max-h-full w-auto max-w-full object-contain object-center drop-shadow-[0_22px_32px_rgba(15,23,42,0.12)]"
                  />
                )}
              </div>
              {mediaItems.length > 1 ? (
                <div className="absolute bottom-3 left-1/2 z-[2] flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/82 px-3 py-2 shadow-[0_10px_22px_rgba(15,23,42,0.06)] backdrop-blur-md">
                  {mediaItems.map((media, mediaIndex) => (
                    <button
                      key={media.publicId}
                      type="button"
                      onClick={() => selectMedia(mediaIndex)}
                      aria-label={`Show promo media ${mediaIndex + 1}`}
                      aria-pressed={mediaIndex === activeMediaIndex}
                      className={`rounded-full transition-[width,background-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/70 ${
                        mediaIndex === activeMediaIndex ? 'h-2 w-6 bg-slate-900' : 'h-2 w-2 bg-slate-300 hover:bg-slate-400'
                      }`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </RevealSection>
  );
};
