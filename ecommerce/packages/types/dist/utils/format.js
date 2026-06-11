/**
 * Formats a number into Sri Lankan Rupees.
 */
export const formatLkr = (value) => new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0
}).format(value);
