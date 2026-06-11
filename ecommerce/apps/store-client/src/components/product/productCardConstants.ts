/**
 * ProductCard animation presets and shared style constants.
 *
 * Extracted from ProductCard.tsx to reduce the main component's cognitive load.
 * These are pure constants — no React state or hooks involved.
 */

export const cinematicEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export type BrandLogoShape = 'square' | 'compact' | 'wide';

export const normalizeBrandLabel = (brand?: string | null): string => {
  const normalizedBrand = typeof brand === 'string' ? brand.trim() : '';
  return normalizedBrand || 'Unbranded';
};

export const resolveProductRatings = (
  ratings?: {
    average?: number | null;
    count?: number | null;
  } | null
): { average: number; count: number } => ({
  average: typeof ratings?.average === 'number' && Number.isFinite(ratings.average) ? ratings.average : 0,
  count: typeof ratings?.count === 'number' && Number.isFinite(ratings.count) ? Math.max(0, Math.trunc(ratings.count)) : 0
});

export const getBrandLogoShapeFromName = (brand?: string | null): BrandLogoShape => {
  const normalizedBrand = normalizeBrandLabel(brand).toLowerCase();

  if (['apple', 'jbl', 'hp'].some((brandName) => normalizedBrand.includes(brandName))) {
    return 'square';
  }

  if (['samsung', 'sony', 'lenovo', 'nillkin', 'canon', 'belkin', 'epson', 'anker'].some((brandName) => normalizedBrand.includes(brandName))) {
    return 'wide';
  }

  return 'compact';
};

/** Builds framer-motion variants that respect reduced motion. */
export const buildAnimationVariants = (reduceMotion: boolean | null) => {
  const immersiveActionTrayVariants = reduceMotion
    ? {
        hidden: { opacity: 1, y: 0, scale: 1 },
        visible: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 1, y: 0, scale: 1 }
      }
    : {
        hidden: { opacity: 0, y: 18, scale: 0.985 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: 'spring' as const,
            stiffness: 260,
            damping: 28,
            mass: 0.72,
            staggerChildren: 0.055,
            delayChildren: 0.04
          }
        },
        exit: {
          opacity: 0,
          y: 12,
          scale: 0.99,
          transition: {
            duration: 0.18,
            ease: cinematicEase
          }
        }
      };

  const immersiveActionItemVariants = reduceMotion
    ? {
        hidden: { opacity: 1, y: 0, scale: 1 },
        visible: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 1, y: 0, scale: 1 }
      }
    : {
        hidden: { opacity: 0, y: 10, scale: 0.96 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: 'spring' as const,
            stiffness: 390,
            damping: 25,
            mass: 0.58
          }
        },
        exit: {
          opacity: 0,
          y: 8,
          scale: 0.96,
          transition: {
            duration: 0.14,
            ease: cinematicEase
          }
        }
      };

  const defaultOptionRevealVariants = reduceMotion
    ? {
        hidden: { opacity: 1, y: 0, scaleY: 1 },
        visible: { opacity: 1, y: 0, scaleY: 1 },
        exit: { opacity: 1, y: 0, scaleY: 1 }
      }
    : {
        hidden: { opacity: 1, y: -8, scaleY: 0.985 },
        visible: {
          opacity: 1,
          y: 0,
          scaleY: 1,
          transition: {
            duration: 0.36,
            ease: cinematicEase,
            delay: 0.02
          }
        },
        exit: {
          opacity: 1,
          y: -6,
          scaleY: 0.99,
          transition: {
            duration: 0.18,
            ease: cinematicEase
          }
        }
      };

  const optionsDrawerSectionVariants = reduceMotion
    ? {
        hidden: { opacity: 1, y: 0 },
        visible: { opacity: 1, y: 0 }
      }
    : {
        hidden: { opacity: 0, y: 22 },
        visible: (index: number) => ({
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.7,
            ease: cinematicEase,
            delay: 0.16 + index * 0.06
          }
        })
      };

  const foregroundContainerVariants = reduceMotion
    ? { rest: {}, active: {} }
    : {
        rest: {
          transition: {
            staggerChildren: 0.05,
            staggerDirection: -1
          }
        },
        active: {
          transition: {
            staggerChildren: 0.07,
            delayChildren: 0.05
          }
        }
      };

  const foregroundItemVariants = reduceMotion
    ? {
        rest: { opacity: 1, y: 0 },
        active: { opacity: 1, y: 0 }
      }
    : {
        rest: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.55,
            ease: cinematicEase
          }
        },
        active: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.72,
            ease: cinematicEase
          }
        }
      };

  const sceneTransition = reduceMotion ? { duration: 0 } : { duration: 0.72, ease: cinematicEase };
  const optionsDrawerTransition = reduceMotion ? { duration: 0 } : { duration: 0.48, ease: cinematicEase };
  const optionsDrawerContentTransition = reduceMotion ? { duration: 0 } : { duration: 0.4, ease: cinematicEase, delay: 0.04 };
  const defaultOptionSceneTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.42, ease: cinematicEase };
  const defaultOptionContentTransition = reduceMotion ? { duration: 0 } : { duration: 0.26, ease: cinematicEase };
  const immersiveActionHover = reduceMotion ? undefined : { y: -2, scale: 1.025 };
  const immersiveActionTap = reduceMotion ? undefined : { y: 0, scale: 0.975 };

  return {
    immersiveActionTrayVariants,
    immersiveActionItemVariants,
    defaultOptionRevealVariants,
    optionsDrawerSectionVariants,
    foregroundContainerVariants,
    foregroundItemVariants,
    sceneTransition,
    optionsDrawerTransition,
    optionsDrawerContentTransition,
    defaultOptionSceneTransition,
    defaultOptionContentTransition,
    immersiveActionHover,
    immersiveActionTap
  };
};
