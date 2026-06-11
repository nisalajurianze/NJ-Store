import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
/**
 * Merges conditional class names with Tailwind conflict resolution.
 */
export const cn = (...inputs) => twMerge(clsx(inputs));
