import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { ImageAsset } from '@njstore/types';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ImageOff, ZoomIn } from 'lucide-react';
import { BacklightGlow } from './BacklightGlow';
import { ProgressiveImage } from '../media/ProgressiveImage';
import { useFastMotionPreference } from '../../hooks/useFastMotionPreference';

interface ImageGalleryProps {
  activeImageIndex: number;
  glowColor: string;
  images: ImageAsset[];
  isZoomEnabled: boolean;
  onToggleZoom: () => void;
  onZoomOffsetChange: (offset: { x: number; y: number }) => void;
  onZoomOriginChange: (origin: { x: number; y: number }) => void;
  onZoomScaleChange: (scale: number) => void;
  onSelectImage: (index: number) => void;
  productName: string;
  zoomOffset: { x: number; y: number };
  zoomOrigin: { x: number; y: number };
  zoomScale: number;
}

const MotionProgressiveImage = motion.create(ProgressiveImage);
const GALLERY_THUMB_WIDTHS = [96, 160, 240] as const;

const replaceCloudinaryUploadTransform = (url: string, transform: string): string => {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }

  return url.replace(/\/upload\/(?:[^/]+\/)?/, `/upload/${transform}/`);
};

const getGalleryThumbUrl = (url: string): string =>
  replaceCloudinaryUploadTransform(url, 'f_auto,q_auto,c_fit,w_160,h_160');

const getGalleryThumbSrcSet = (url: string): string | undefined =>
  url.includes('res.cloudinary.com') && url.includes('/upload/')
    ? GALLERY_THUMB_WIDTHS.map((width) => (
        `${replaceCloudinaryUploadTransform(url, `f_auto,q_auto,c_fit,w_${width},h_${width}`)} ${width}w`
      )).join(', ')
    : undefined;

export const ImageGallery = ({
  activeImageIndex,
  glowColor,
  images,
  isZoomEnabled,
  onToggleZoom,
  onZoomOffsetChange,
  onZoomOriginChange,
  onZoomScaleChange,
  onSelectImage,
  productName,
  zoomOffset,
  zoomOrigin,
  zoomScale
}: ImageGalleryProps): JSX.Element => {
  const reduceMotion = useReducedMotion();
  const fastMotion = useFastMotionPreference();
  const reduceEffects = Boolean(reduceMotion || fastMotion);
  const activeImage = images[activeImageIndex] ?? images[0];
  const isInlineZoomActive = isZoomEnabled;
  const activePointersRef = useRef(new Map<number, { clientX: number; clientY: number }>());
  const panStartRef = useRef<{ clientX: number; clientY: number; offset: { x: number; y: number } } | null>(null);
  const pinchStartRef = useRef<{ distance: number; scale: number; offset: { x: number; y: number } } | null>(null);

  useEffect(() => {
    activePointersRef.current.clear();
    panStartRef.current = null;
    pinchStartRef.current = null;
  }, [activeImage?.url]);

  useEffect(() => {
    if (isZoomEnabled) {
      return;
    }

    activePointersRef.current.clear();
    panStartRef.current = null;
    pinchStartRef.current = null;
  }, [isZoomEnabled]);

  const getPointerOrigin = (target: HTMLDivElement, pointer: { clientX: number; clientY: number }): { x: number; y: number } => {
    const bounds = target.getBoundingClientRect();
    return {
      x: ((pointer.clientX - bounds.left) / bounds.width) * 100,
      y: ((pointer.clientY - bounds.top) / bounds.height) * 100
    };
  };

  const getPinchDistance = (left: { clientX: number; clientY: number }, right: { clientX: number; clientY: number }): number =>
    Math.hypot(right.clientX - left.clientX, right.clientY - left.clientY);

  const clampOffset = (target: HTMLDivElement, offset: { x: number; y: number }, scale = zoomScale): { x: number; y: number } => {
    const bounds = target.getBoundingClientRect();
    const maxX = Math.max((bounds.width * (scale - 1)) / 2, 0);
    const maxY = Math.max((bounds.height * (scale - 1)) / 2, 0);

    return {
      x: Math.min(Math.max(offset.x, -maxX), maxX),
      y: Math.min(Math.max(offset.y, -maxY), maxY)
    };
  };

  const syncZoomGesture = (target: HTMLDivElement): void => {
    const pointers = Array.from(activePointersRef.current.values());

    if (pointers.length >= 2) {
      const [firstPointer, secondPointer] = pointers;
      const distance = getPinchDistance(firstPointer, secondPointer);
      const midpoint = {
        clientX: (firstPointer.clientX + secondPointer.clientX) / 2,
        clientY: (firstPointer.clientY + secondPointer.clientY) / 2
      };

      if (!pinchStartRef.current) {
        pinchStartRef.current = { distance, scale: zoomScale, offset: zoomOffset };
      }

      onZoomOriginChange(getPointerOrigin(target, midpoint));
      const nextScale = pinchStartRef.current.scale * (distance / Math.max(pinchStartRef.current.distance, 1));
      onZoomScaleChange(nextScale);
      onZoomOffsetChange(clampOffset(target, pinchStartRef.current.offset, nextScale));
      panStartRef.current = null;
      return;
    }

    pinchStartRef.current = null;

    if (pointers[0]) {
      if (!panStartRef.current) {
        panStartRef.current = {
          clientX: pointers[0].clientX,
          clientY: pointers[0].clientY,
          offset: zoomOffset
        };
      }

      onZoomOffsetChange(
        clampOffset(target, {
          x: panStartRef.current.offset.x + pointers[0].clientX - panStartRef.current.clientX,
          y: panStartRef.current.offset.y + pointers[0].clientY - panStartRef.current.clientY
        })
      );
      onZoomOriginChange({ x: 50, y: 50 });
    }
  };

  const handleZoomPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!isZoomEnabled) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    syncZoomGesture(event.currentTarget);
  };

  const handleZoomPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!isZoomEnabled || !activePointersRef.current.has(event.pointerId)) {
      return;
    }

    activePointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    syncZoomGesture(event.currentTarget);
  };

  const handleZoomPointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    activePointersRef.current.delete(event.pointerId);
    panStartRef.current = null;
    pinchStartRef.current = null;
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[88px_minmax(0,1fr)] lg:items-start lg:gap-4">
      <div className="order-2 flex gap-2.5 overflow-x-auto px-1 py-2 lg:order-1 lg:max-h-[540px] lg:flex-col lg:self-start lg:overflow-x-hidden lg:overflow-y-auto lg:px-0 lg:py-0 lg:pr-1">
        {images.map((image, index) => (
          <button
            key={`${image.publicId ?? image.url}-${index}`}
            type="button"
            onClick={() => onSelectImage(index)}
            className={`relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-white/[0.035] p-2 transition-[border-color,background-color,box-shadow] duration-200 ${
              index === activeImageIndex ? 'border-gold bg-gold/10 shadow-[0_0_0_1px_rgba(212,175,55,0.28)]' : 'border-white/10 hover:border-white/25'
            }`}
            aria-pressed={index === activeImageIndex}
            aria-label={`Show image ${index + 1} for ${productName}`}
          >
            <ProgressiveImage
              src={getGalleryThumbUrl(image.url)}
              srcSet={getGalleryThumbSrcSet(image.url) ?? image.srcSet}
              alt={image.alt ?? productName}
              loading="lazy"
              decoding="async"
              sizes="80px"
              className="product-gallery-thumb-image"
            />
          </button>
        ))}
      </div>

      <div className="order-1 lg:order-2">
        <div className="product-gallery-media-frame group/gallery relative flex min-h-[310px] items-center justify-center overflow-hidden rounded-[26px] border border-white/[0.08] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.075),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012))] p-3 shadow-[0_24px_70px_rgba(2,6,23,0.24)] sm:min-h-[390px] sm:rounded-[28px] sm:p-5 lg:min-h-[500px] xl:min-h-[540px]">
            <div className="pointer-events-none absolute inset-x-[18%] bottom-[8%] h-20 rounded-full bg-black/35 opacity-70 blur-3xl transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/gallery:scale-[1.04] group-hover/gallery:opacity-85" />

            {activeImage ? (
              <button
                type="button"
                onClick={onToggleZoom}
                className={`absolute right-3 top-3 z-[3] inline-flex h-10 w-10 items-center justify-center rounded-full border text-white backdrop-blur transition-colors duration-200 sm:right-4 sm:top-4 ${
                  isZoomEnabled
                    ? 'border-gold bg-gold/20 shadow-[0_0_0_1px_rgba(212,175,55,0.2)]'
                    : 'border-white/10 bg-black/35 hover:border-gold/35 hover:bg-black/45'
                }`}
                aria-pressed={isZoomEnabled}
                aria-label={isZoomEnabled ? 'Turn product image zoom off' : 'Turn product image zoom on'}
              >
                <ZoomIn className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}

            {activeImage ? (
              <div
                onPointerDown={handleZoomPointerDown}
                onPointerMove={handleZoomPointerMove}
                onPointerUp={handleZoomPointerUp}
                onPointerCancel={handleZoomPointerUp}
                className={`absolute inset-3 z-[1] isolate flex select-none items-center justify-center overflow-hidden rounded-[22px] p-3 text-left sm:inset-5 sm:p-5 ${
                  isZoomEnabled ? 'cursor-grab touch-none active:cursor-grabbing' : 'touch-pan-y'
                }`}
              >
                <BacklightGlow
                  color={glowColor}
                  className="h-[58%] w-[72%] blur-[72px] opacity-80 sm:h-[66%] sm:w-[68%] sm:blur-[86px] lg:h-[70%] lg:w-[62%] lg:blur-[96px]"
                />
                <AnimatePresence mode="wait" initial={false}>
                  <MotionProgressiveImage
                    key={`${activeImage.publicId ?? activeImage.url}-${activeImageIndex}`}
                    data-testid="product-gallery-active-image"
                    src={activeImage.url}
                    srcSet={activeImage.srcSet}
                    alt={activeImage.alt ?? productName}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    sizes={activeImage.sizes ?? '(min-width: 1280px) 52vw, (min-width: 1024px) 46vw, 94vw'}
                    className="product-gallery-image relative z-[2]"
                    style={{
                      transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`
                    }}
                    initial={reduceEffects ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
                    animate={
                      reduceEffects
                        ? { opacity: 1, scale: isInlineZoomActive ? zoomScale : 1, x: isInlineZoomActive ? zoomOffset.x : 0, y: isInlineZoomActive ? zoomOffset.y : 0 }
                        : {
                            opacity: 1,
                            scale: isInlineZoomActive ? zoomScale : 1,
                            x: isInlineZoomActive ? zoomOffset.x : 0,
                            y: isInlineZoomActive ? zoomOffset.y : 0
                          }
                    }
                    exit={reduceEffects ? { opacity: 0.96, scale: 1 } : { opacity: 0, scale: 1.05 }}
                    transition={
                      isInlineZoomActive
                        ? { duration: 0.04, ease: 'linear' }
                        : reduceEffects
                          ? { duration: 0.15, ease: 'easeOut' }
                          : {
                              duration: 0.4,
                              ease: 'easeInOut'
                            }
                    }
                  />
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center text-gray-400">
                <ImageOff className="h-10 w-10" aria-hidden="true" />
                <span>No product image available</span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
