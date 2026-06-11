import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '@njstore/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  bodyClassName?: string;
}

export const Card = ({
  children,
  className,
  title,
  description,
  bodyClassName,
  ...props
}: PropsWithChildren<CardProps>): JSX.Element => (
  <div
    className={cn(
      'transform-gpu rounded-[22px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-md shadow-[0_14px_30px_rgba(0,0,0,0.18)] transition-[transform,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.002] motion-safe:hover:will-change-transform motion-reduce:transform-none motion-reduce:transition-none sm:rounded-[28px] sm:p-6 sm:shadow-[0_18px_40px_rgba(0,0,0,0.22)]',
      className
    )}
    {...props}
  >
    {title ? <h3 className="font-display text-[1.18rem] leading-tight text-white sm:text-[1.35rem]">{title}</h3> : null}
    {description ? <p className="mt-2 text-[13px] leading-5 text-gray-400 sm:mt-2.5 sm:text-sm sm:leading-6">{description}</p> : null}
    <div className={cn(title || description ? 'mt-4 sm:mt-5' : '', bodyClassName)}>{children}</div>
  </div>
);
