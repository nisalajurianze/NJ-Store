import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@njstore/utils/cn';
import { useFastMotionPreference } from '../../hooks/useFastMotionPreference';

interface BacklightGlowProps {
  color: string;
  className?: string;
}

const CENTERED_POSITION = { x: '-50%', y: '-50%' } as const;

export const BacklightGlow = ({ color, className }: BacklightGlowProps): JSX.Element => {
  const reduceMotion = useReducedMotion();
  const fastMotion = useFastMotionPreference();
  const reduceEffects = Boolean(reduceMotion || fastMotion);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={color}
        data-testid="product-backlight-glow"
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-1/2 top-1/2 z-0 h-[18rem] w-[18rem] rounded-full blur-[88px] sm:h-[24rem] sm:w-[24rem] lg:h-[28rem] lg:w-[28rem]',
          className
        )}
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 72%)`
        }}
        initial={reduceEffects ? { ...CENTERED_POSITION, opacity: 0.3, scale: 1 } : { ...CENTERED_POSITION, opacity: 0, scale: 0.86 }}
        animate={
          reduceEffects
            ? { ...CENTERED_POSITION, opacity: 0.32, scale: 1 }
            : {
                ...CENTERED_POSITION,
                opacity: [0.24, 0.42, 0.34],
                scale: [0.96, 1.03, 1]
              }
        }
        exit={reduceEffects ? { ...CENTERED_POSITION, opacity: 0.24, scale: 1 } : { ...CENTERED_POSITION, opacity: 0, scale: 1.08 }}
        transition={
          reduceEffects
            ? { duration: 0.2, ease: 'easeOut' }
            : {
                duration: 0.55,
                ease: 'easeInOut'
              }
        }
      />
    </AnimatePresence>
  );
};
