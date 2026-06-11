/**
 * Formats a number into Sri Lankan Rupees.
 */
export const formatLkr = (value: number): string =>
  new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0
  }).format(value);
