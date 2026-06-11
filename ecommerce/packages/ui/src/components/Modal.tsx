import { useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes, type PropsWithChildren } from 'react';
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@njstore/utils/cn';
import { motionTiming } from '@njstore/utils/motion';
import { Button } from './Button.js';

type ModalSize = 'md' | 'lg' | 'xl' | 'full';
type ModalPanelProps = Pick<
  HTMLAttributes<HTMLDivElement>,
  'className' | 'style' | 'onMouseEnter' | 'onMouseLeave' | 'onPointerEnter' | 'onPointerLeave'
>;

export interface ModalOriginRect {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: number;
}

export interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  size?: ModalSize;
  contentClassName?: string;
  bodyClassName?: string;
  overlayClassName?: string;
  panelProps?: ModalPanelProps;
  originRect?: ModalOriginRect | null;
  anchorToOrigin?: boolean;
  anchoredOffset?: number;
  morphOnClose?: boolean;
  closeOnBackdropPointerDown?: boolean;
  lockBodyScroll?: boolean;
  ariaModal?: boolean;
  overlayVariant?: 'default' | 'transparent' | 'plain';
  showHeader?: boolean;
  performanceMode?: 'default' | 'fast';
}

const sizeClasses: Record<ModalSize, string> = {
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[min(1480px,calc(100vw-2rem))]'
};

type MorphState = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  borderRadius: number;
};

type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type AnchoredPlacement = {
  left: number;
  top: number;
  width: number;
};

const MORPH_TRANSITION = {
  duration: 0.68,
  ease: [0.22, 1, 0.36, 1] as const
};

const FAST_MORPH_TRANSITION = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1] as const
};

const CONTENT_MORPH_TRANSITION = {
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1] as const
};

const FAST_CONTENT_MORPH_TRANSITION = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1] as const
};

const DEFAULT_RADIUS = 30;
const INITIAL_MORPH_SURFACE = {
  backgroundColor: 'var(--app-modal-morph-initial-surface, rgba(255,255,255,0.08))',
  borderColor: 'var(--app-modal-morph-initial-border, rgba(255,255,255,0.16))',
  boxShadow: 'var(--app-modal-morph-initial-shadow, 0 12px 28px rgba(3,5,11,0.16))'
};
const FINAL_MORPH_SURFACE = {
  backgroundColor: 'var(--app-modal-surface, rgba(3,5,11,0.98))',
  borderColor: 'var(--app-modal-border, rgba(255,255,255,0.10))',
  boxShadow: 'var(--app-modal-shadow, 0 28px 70px rgba(0,0,0,0.42))'
};

const isValidRect = (rect?: Partial<ModalOriginRect> | null): rect is ModalOriginRect =>
  Boolean(
    rect
      && Number.isFinite(rect.left)
      && Number.isFinite(rect.top)
      && Number.isFinite(rect.width)
      && Number.isFinite(rect.height)
      && (rect.width ?? 0) > 0
      && (rect.height ?? 0) > 0
  );

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const buildMorphState = (originRect: ModalOriginRect, finalRect: RectLike): MorphState | null => {
  if (!isValidRect(originRect) || finalRect.width <= 0 || finalRect.height <= 0) {
    return null;
  }

  const originCenterX = originRect.left + originRect.width / 2;
  const originCenterY = originRect.top + originRect.height / 2;
  const finalCenterX = finalRect.left + finalRect.width / 2;
  const finalCenterY = finalRect.top + finalRect.height / 2;

  return {
    x: originCenterX - finalCenterX,
    y: originCenterY - finalCenterY,
    scaleX: clamp(originRect.width / finalRect.width, 0.14, 1),
    scaleY: clamp(originRect.height / finalRect.height, 0.08, 1),
    borderRadius: originRect.borderRadius ?? Math.min(originRect.width, originRect.height) / 2
  };
};

export const Modal = ({
  children,
  isOpen,
  onClose,
  title,
  size = 'md',
  contentClassName,
  bodyClassName,
  overlayClassName,
  panelProps,
  originRect,
  anchorToOrigin = false,
  anchoredOffset = 14,
  morphOnClose = true,
  closeOnBackdropPointerDown = true,
  lockBodyScroll = true,
  ariaModal = true,
  overlayVariant = 'default',
  showHeader = true,
  performanceMode = 'default'
}: PropsWithChildren<ModalProps>): JSX.Element | null => {
  const reduceMotion = useReducedMotion();
  const isFastMode = performanceMode === 'fast';
  const [isMounted, setIsMounted] = useState(false);
  const [morphState, setMorphState] = useState<MorphState | null>(null);
  const [anchoredPlacement, setAnchoredPlacement] = useState<AnchoredPlacement | null>(null);
  const [isMorphReady, setIsMorphReady] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();

  const isBackdropPointerDown = (target: EventTarget | null): boolean => {
    if (!contentRef.current) {
      return true;
    }

    return !(target instanceof Node) || !contentRef.current.contains(target);
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (lockBodyScroll) {
      document.body.style.overflow = 'hidden';
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (lockBodyScroll) {
        document.body.style.overflow = previousOverflow;
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, lockBodyScroll, onClose]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setMorphState(null);
      setAnchoredPlacement(null);
      setIsMorphReady(false);
      return;
    }

    const defaultState = {
      opacity: 1,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      borderRadius: DEFAULT_RADIUS,
      ...(isFastMode ? {} : { filter: 'blur(0px)' }),
      ...FINAL_MORPH_SURFACE
    };

    if (reduceMotion || !isValidRect(originRect) || !contentRef.current) {
      setMorphState(null);
      setAnchoredPlacement(null);
      setIsMorphReady(true);
      controls.set(defaultState);
      return;
    }

    const measuredRect = contentRef.current.getBoundingClientRect();
    const viewportPadding = window.innerWidth < 640 ? 8 : window.innerWidth < 1024 ? 16 : 24;
    const anchoredWidth = Math.min(measuredRect.width, window.innerWidth - viewportPadding * 2);
    const anchoredHeight = Math.min(measuredRect.height, window.innerHeight - viewportPadding * 2);
    const anchoredLeft = clamp(
      originRect.left + originRect.width / 2 - anchoredWidth / 2,
      viewportPadding,
      window.innerWidth - anchoredWidth - viewportPadding
    );
    const anchoredTop = clamp(
      originRect.top + originRect.height + anchoredOffset,
      viewportPadding,
      window.innerHeight - anchoredHeight - viewportPadding
    );
    const finalRect = anchorToOrigin
      ? {
          left: anchoredLeft,
          top: anchoredTop,
          width: anchoredWidth,
          height: anchoredHeight
        }
      : {
          left: measuredRect.left,
          top: measuredRect.top,
          width: measuredRect.width,
          height: measuredRect.height
        };
    const nextMorphState = buildMorphState(originRect, finalRect);
    if (!nextMorphState) {
      setMorphState(null);
      setAnchoredPlacement(null);
      setIsMorphReady(true);
      controls.set(defaultState);
      return;
    }

    setMorphState(nextMorphState);
    setAnchoredPlacement(
      anchorToOrigin
        ? {
            left: anchoredLeft,
            top: anchoredTop,
            width: anchoredWidth
          }
        : null
    );
    setIsMorphReady(true);
    controls.set({
      opacity: 1,
      x: nextMorphState.x,
      y: nextMorphState.y,
      scaleX: nextMorphState.scaleX,
      scaleY: nextMorphState.scaleY,
      borderRadius: nextMorphState.borderRadius,
      ...(isFastMode ? {} : { filter: 'blur(0.5px)' }),
      ...INITIAL_MORPH_SURFACE
    });
  }, [anchorToOrigin, anchoredOffset, controls, isFastMode, isOpen, originRect, reduceMotion]);

  useEffect(() => {
    if (!isOpen || !isMorphReady) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      void controls.start({
        opacity: 1,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        borderRadius: DEFAULT_RADIUS,
        ...(isFastMode ? {} : { filter: 'blur(0px)' }),
        ...FINAL_MORPH_SURFACE,
        transition: morphState ? (isFastMode ? FAST_MORPH_TRANSITION : MORPH_TRANSITION) : motionTiming.modal
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [controls, isFastMode, isMorphReady, isOpen, morphState]);

  if (!isMounted) {
    return null;
  }

  const shouldUseMorph = Boolean(!reduceMotion && morphState);
  const shouldUseMorphOnClose = Boolean(shouldUseMorph && morphOnClose);
  const shouldHideUntilMorphReady = Boolean(isOpen && !reduceMotion && isValidRect(originRect) && !isMorphReady);
  const { className: panelClassName, style: panelStyle, ...panelRestProps } = panelProps ?? {};
  const anchoredStyle = anchorToOrigin && anchoredPlacement
    ? {
        position: 'fixed' as const,
        left: anchoredPlacement.left,
        top: anchoredPlacement.top,
        width: anchoredPlacement.width
      }
    : undefined;
  const contentMotion = shouldUseMorph
    ? {
        initial: { opacity: 0, y: 10, scale: 0.992 },
        animate: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            ...(isFastMode ? FAST_CONTENT_MORPH_TRANSITION : CONTENT_MORPH_TRANSITION),
            delay: isFastMode ? 0.04 : 0.26
          }
        },
        exit: {
          opacity: 0,
          y: 8,
          scale: 0.992,
          transition: {
            duration: 0.22,
            ease: [0.22, 1, 0.36, 1] as const
          }
        }
      }
    : reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          animate: {
            opacity: 1,
            y: 0,
            transition: {
              duration: 0.22,
              ease: [0.22, 1, 0.36, 1] as const,
              delay: 0.04
            }
          },
          exit: {
            opacity: 0,
            y: 6,
            transition: {
              duration: 0.12,
              ease: [0.22, 1, 0.36, 1] as const
            }
          }
        };

  return createPortal(
    <AnimatePresence initial={false} mode="wait">
      {isOpen ? (
        <motion.div
          className={cn(
            overlayVariant === 'transparent'
              ? 'fixed inset-0 z-50 overflow-visible bg-transparent'
              : overlayVariant === 'plain'
                ? 'fixed inset-0 z-50 overflow-x-hidden overflow-y-auto bg-black/60 p-2 sm:p-6 lg:p-8'
                : 'fixed inset-0 z-50 overflow-x-hidden overflow-y-auto bg-black/72 p-2 backdrop-blur-[6px] sm:p-6 lg:p-8',
            overlayClassName
          )}
          role="dialog"
          aria-modal={ariaModal}
          aria-label={title}
          initial={
            reduceMotion
              ? false
              : overlayVariant === 'default'
                ? { opacity: 0, backdropFilter: 'blur(0px)' }
                : overlayVariant === 'transparent'
                ? { opacity: 0 }
                : { opacity: 0 }
          }
          animate={
            reduceMotion
              ? undefined
              : overlayVariant === 'default'
                ? { opacity: 1, backdropFilter: 'blur(6px)' }
                : overlayVariant === 'transparent'
                ? { opacity: 1 }
                : { opacity: 1 }
          }
          exit={
            reduceMotion
              ? undefined
              : overlayVariant === 'default'
                ? {
                    opacity: 0,
                    backdropFilter: 'blur(0px)',
                    pointerEvents: 'none'
                  }
                : overlayVariant === 'transparent'
                ? {
                    opacity: 0,
                    pointerEvents: 'none'
                  }
                : {
                    opacity: 0,
                    pointerEvents: 'none'
                  }
          }
          transition={
            reduceMotion
              ? undefined
              : {
                  duration: shouldUseMorph
                    ? overlayVariant === 'default'
                      ? 0.36
                      : 0.24
                    : overlayVariant === 'default'
                      ? motionTiming.overlay.duration
                      : 0.16,
                  ease: [0.22, 1, 0.36, 1]
                }
          }
          onPointerDown={(event) => {
            if (closeOnBackdropPointerDown && isBackdropPointerDown(event.target)) {
              onClose();
            }
          }}
        >
          <div className="flex min-h-full min-w-0 items-start justify-center sm:items-center">
            <motion.div
              ref={contentRef}
              initial={shouldUseMorph ? false : reduceMotion ? false : { opacity: 0, y: 20, scale: 0.99 }}
              animate={shouldUseMorph ? controls : reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              exit={
                shouldUseMorphOnClose
                  ? {
                      opacity: 1,
                      x: morphState?.x ?? 0,
                      y: morphState?.y ?? 0,
                      scaleX: morphState?.scaleX ?? 1,
                      scaleY: morphState?.scaleY ?? 1,
                      borderRadius: morphState?.borderRadius ?? DEFAULT_RADIUS,
                      ...(isFastMode ? {} : { filter: 'blur(0.5px)' }),
                      pointerEvents: 'none',
                      ...INITIAL_MORPH_SURFACE,
                      transition: isFastMode ? FAST_MORPH_TRANSITION : MORPH_TRANSITION
                    }
                  : reduceMotion
                    ? undefined
                    : { opacity: 0, y: 16, scale: 0.99, pointerEvents: 'none' }
              }
              transition={shouldUseMorph || reduceMotion ? undefined : motionTiming.modal}
              {...panelRestProps}
              style={{
                borderRadius: DEFAULT_RADIUS,
                ...(panelStyle ?? {}),
                ...(shouldHideUntilMorphReady ? { visibility: 'hidden' as const } : {}),
                ...(anchoredStyle ?? {})
              }}
              className={cn(
                'flex max-h-[min(880px,calc(100dvh-1rem))] w-full min-w-0 flex-col overflow-hidden rounded-[30px] border border-[color:var(--app-modal-border,rgba(255,255,255,0.10))] bg-[var(--app-modal-surface,#03050b)] text-[var(--app-modal-text,#f8fafc)] shadow-[var(--app-modal-shadow,0_28px_70px_rgba(0,0,0,0.42))] sm:max-h-[min(880px,calc(100dvh-2rem))]',
                sizeClasses[size],
                contentClassName,
                panelClassName
              )}
            >
              <motion.div className="contents" {...contentMotion}>
                {showHeader ? (
                  <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[color:var(--app-modal-border,rgba(255,255,255,0.10))] bg-[var(--app-modal-header-surface,rgba(255,255,255,0.02))] px-4 py-4 sm:px-7 sm:py-5">
                    <h2 className="min-w-0 break-words font-display text-[1.35rem] leading-tight text-[var(--app-modal-text,#f8fafc)] sm:text-[1.8rem] sm:leading-none">{title}</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-[var(--app-modal-muted,rgba(226,232,240,0.74))] hover:bg-[var(--app-modal-control-hover,rgba(255,255,255,0.07))] hover:text-[var(--app-modal-text,#f8fafc)]"
                      onClick={onClose}
                      aria-label="Close modal"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
                <div
                  className={cn(
                    'min-w-0 overflow-y-auto overscroll-contain px-4 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6',
                    !showHeader && 'px-0 pb-0 pt-0 sm:px-0 sm:pb-0 sm:pt-0',
                    bodyClassName
                  )}
                >
                  {children}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
};
