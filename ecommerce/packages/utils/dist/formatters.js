/**
 * Formats a number into Sri Lankan Rupees.
 */
export const formatCurrency = (value) => new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0
}).format(Math.round(value));
/**
 * Formats a date for human-readable UI display.
 */
export const formatDate = (value) => new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
}).format(new Date(value));
export const truncate = (value, maxLength = 140) => value.length <= maxLength ? value : `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
