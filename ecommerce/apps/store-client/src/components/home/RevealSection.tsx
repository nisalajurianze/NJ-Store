import type { ReactNode } from 'react';
import { useInView } from '../../hooks/useInView';

interface RevealSectionProps {
  children: ReactNode;
  className?: string;
}

export const RevealSection = ({ children, className = '' }: RevealSectionProps): JSX.Element => {
  const { ref, inView } = useInView({ rootMargin: '280px 0px', threshold: 0.01 });

  return (
    <section ref={ref} className={`section-reveal ${inView ? 'in-view' : ''} ${className}`}>
      {children}
    </section>
  );
};
