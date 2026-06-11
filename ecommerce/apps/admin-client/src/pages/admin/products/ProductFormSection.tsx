import type { ReactNode } from 'react';

interface ProductFormSectionProps {
  id?: string;
  title: string;
  description: string;
  children: ReactNode;
}

export const ProductFormSection = ({ id, title, description, children }: ProductFormSectionProps): JSX.Element => (
  <section
    id={id}
    className="relative scroll-mt-24 rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-none"
  >
    <div className="border-b border-white/10 pb-3">
      <div className="min-w-0">
        <h3 className="text-base font-semibold leading-tight text-white">{title}</h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-400">{description}</p>
      </div>
    </div>
    <div className="mt-4">{children}</div>
  </section>
);
