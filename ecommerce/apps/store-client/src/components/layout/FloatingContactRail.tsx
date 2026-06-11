import type { SiteConfigDto } from '@njstore/types';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Phone, X } from 'lucide-react';
import { startTransition, useEffect, useRef, useState } from 'react';
import { useFastMotionPreference } from '../../hooks/useFastMotionPreference';
import { siteConfigService } from '../../services/siteConfigService';
import {
  buildWhatsAppUrl,
  normalizeDialTarget,
  normalizeDisplayPhone,
  normalizeWhatsAppNumber,
  SUPPORT_WHATSAPP_MESSAGE
} from './storefrontConfig';

const FAB_SPRING_TRANSITION = {
  type: 'spring',
  stiffness: 340,
  damping: 24,
  mass: 0.64
} as const;

const FAB_FAST_TWEEN_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1]
} as const;

const FAB_EXIT_TRANSITION = {
  duration: 0.16,
  ease: 'easeInOut'
} as const;

const FAB_FAST_EXIT_TRANSITION = {
  duration: 0.12,
  ease: [0.4, 0, 0.2, 1]
} as const;

const WhatsAppGlyph = (): JSX.Element => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M15.99 3.2C8.93 3.2 3.2 8.92 3.2 15.97c0 2.26.6 4.47 1.72 6.42L3.2 28.8l6.58-1.68a12.8 12.8 0 0 0 6.22 1.6c7.07 0 12.8-5.72 12.8-12.77S23.06 3.2 15.99 3.2Zm0 23.16a10.4 10.4 0 0 1-5.3-1.45l-.38-.22-3.88.99 1.03-3.77-.24-.4a10.34 10.34 0 0 1-1.6-5.54c0-5.72 4.66-10.37 10.39-10.37 5.72 0 10.38 4.65 10.38 10.37 0 5.72-4.66 10.38-10.4 10.38Z"
      fill="currentColor"
    />
    <path
      d="M21.95 18.95c-.33-.16-1.95-.96-2.26-1.07-.3-.1-.52-.16-.74.17-.21.33-.85 1.06-1.04 1.28-.19.22-.38.25-.7.08-.33-.17-1.37-.5-2.62-1.6-.96-.86-1.61-1.92-1.8-2.24-.2-.33-.02-.5.14-.66.14-.14.33-.36.49-.54.16-.18.21-.3.33-.5.1-.21.05-.4-.03-.58-.08-.16-.74-1.78-1-2.45-.28-.66-.55-.57-.75-.58h-.64c-.22 0-.58.08-.88.41s-1.16 1.13-1.16 2.74c0 1.62 1.2 3.17 1.35 3.38.17.22 2.36 3.6 5.7 5.05.79.34 1.4.54 1.87.69.8.25 1.52.22 2.1.13.64-.1 1.95-.8 2.23-1.58.27-.78.27-1.44.19-1.58-.08-.13-.3-.2-.63-.36Z"
      fill="currentColor"
    />
  </svg>
);

type FloatingContactFabProps = {
  phoneHref: string;
  phoneLabel: string;
  whatsappHref: string;
};

const stackVariants = {
  closed: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      staggerDirection: 1,
      when: 'afterChildren'
    }
  },
  open: {
    opacity: 1,
    transition: {
      staggerChildren: 0.075,
      staggerDirection: -1,
      delayChildren: 0.02
    }
  }
} as const;

const childSpringVariants = {
  closed: {
    opacity: 0,
    y: 28,
    scale: 0.9,
    transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] }
  },
  open: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 26,
      mass: 0.68
    }
  }
} as const;

const childFastVariants = {
  closed: {
    opacity: 0,
    y: 20,
    scale: 0.96,
    transition: { duration: 0.12, ease: [0.4, 0, 0.2, 1] }
  },
  open: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: FAB_FAST_TWEEN_TRANSITION
  }
} as const;

const fabButtonClassName =
  'flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm shadow-lg transition-transform duration-200 will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 sm:h-12 sm:w-12';

const FloatingContactFab = ({ phoneHref, phoneLabel, whatsappHref }: FloatingContactFabProps): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const preferFastMotion = useFastMotionPreference();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const childVariants = preferFastMotion ? childFastVariants : childSpringVariants;
  const launcherTransition = preferFastMotion ? FAB_FAST_TWEEN_TRANSITION : FAB_SPRING_TRANSITION;
  const launcherExitTransition = preferFastMotion ? FAB_FAST_EXIT_TRANSITION : FAB_EXIT_TRANSITION;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) {
        startTransition(() => {
          setIsOpen(false);
        });
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  const handleOpen = (): void => {
    if (isOpen) {
      return;
    }

    startTransition(() => {
      setIsOpen(true);
    });
  };

  const handleClose = (): void => {
    startTransition(() => {
      setIsOpen(false);
    });
  };

  return (
    <div ref={containerRef} className="floating-contact-fab fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-[60] transition-[bottom] duration-300 sm:bottom-[calc(5.75rem+env(safe-area-inset-bottom))] sm:right-6 lg:bottom-6">
      <div className="flex flex-col items-end gap-2.5 sm:gap-3">
        <AnimatePresence initial={false} mode="sync">
          {isOpen ? (
            <motion.div
              key="fab-stack"
              layout={!preferFastMotion}
              className="flex flex-col items-end gap-3"
              variants={reduceMotion ? undefined : stackVariants}
              initial={reduceMotion ? { opacity: 0 } : 'closed'}
              animate={reduceMotion ? { opacity: 1 } : 'open'}
              exit={reduceMotion ? { opacity: 0 } : 'closed'}
              style={{ transformOrigin: 'bottom right' }}
            >
              <motion.a
                href={phoneHref}
                aria-label={phoneLabel}
                title="Call"
                className={`${fabButtonClassName} bg-[#1f1f1f]/95 text-slate-50 hover:scale-105`}
                variants={reduceMotion ? undefined : childVariants}
                whileHover={reduceMotion ? undefined : { scale: 1.06, y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              >
                <Phone className="h-5 w-5" strokeWidth={2.4} />
              </motion.a>

              <motion.a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                title="WhatsApp"
                className={`${fabButtonClassName} bg-[#25D366]/95 text-[#0b2a4d] hover:scale-105`}
                variants={reduceMotion ? undefined : childVariants}
                whileHover={reduceMotion ? undefined : { scale: 1.06, y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              >
                <WhatsAppGlyph />
              </motion.a>

              <motion.button
                type="button"
                aria-label="Close"
                title="Close"
                onClick={handleClose}
                className={`${fabButtonClassName} bg-[#8b5cf6]/90 text-slate-50 hover:scale-105`}
                variants={reduceMotion ? undefined : childVariants}
                whileHover={reduceMotion ? undefined : { scale: 1.06, y: -2, rotate: 8 }}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              >
                <X className="h-5 w-5" strokeWidth={2.4} />
              </motion.button>
            </motion.div>
          ) : (
            <motion.button
              key="fab-launcher"
              type="button"
              aria-label="Open contact actions"
              aria-expanded={false}
              title="Call"
              onClick={handleOpen}
              className={`${fabButtonClassName} bg-[#1f1f1f] text-slate-50 hover:scale-105`}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.88, rotate: -8 }}
              animate={
                reduceMotion
                  ? { opacity: 1 }
                  : {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      rotate: 0,
                      transition: launcherTransition
                    }
              }
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : {
                      opacity: 0,
                      y: 12,
                      scale: 0.9,
                      rotate: 8,
                      transition: launcherExitTransition
                    }
              }
              whileHover={reduceMotion ? undefined : { scale: 1.06, y: -2 }}
              whileTap={reduceMotion ? undefined : { scale: 0.95 }}
            >
              <Phone className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.4} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

type FloatingContactRailProps = {
  siteConfig?: Pick<SiteConfigDto, 'supportPhoneNumber' | 'whatsappNumber'>;
};

export const FloatingContactRail = ({ siteConfig }: FloatingContactRailProps = {}): JSX.Element => {
  const siteConfigQuery = useQuery({
    queryKey: ['site-config'],
    queryFn: () => siteConfigService.get(),
    staleTime: 5 * 60_000,
    enabled: siteConfig == null
  });

  const resolvedSiteConfig = siteConfig ?? siteConfigQuery.data;
  const supportPhoneNumber = normalizeDisplayPhone(resolvedSiteConfig?.supportPhoneNumber);
  const phoneHref = normalizeDialTarget(resolvedSiteConfig?.supportPhoneNumber);
  const whatsappHref = buildWhatsAppUrl(normalizeWhatsAppNumber(resolvedSiteConfig?.whatsappNumber), SUPPORT_WHATSAPP_MESSAGE);

  return <FloatingContactFab phoneHref={phoneHref} phoneLabel={`Call NJ Store (${supportPhoneNumber})`} whatsappHref={whatsappHref} />;
};
