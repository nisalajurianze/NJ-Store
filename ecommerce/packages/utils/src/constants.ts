export const themeColors = {
  navy: '#0A1F44',
  navyLight: '#1a3a6e',
  dark: '#1A1A1A',
  darkLight: '#2a2a2a',
  white: '#FFFFFF',
  gray400: '#9ca3af',
  gold: '#D4AF37',
  goldLight: '#f0d060',
  goldDark: '#b8971f'
} as const;

export const sriLankanDistricts = [
  'Colombo',
  'Gampaha',
  'Kalutara',
  'Kandy',
  'Galle',
  'Matara',
  'Jaffna',
  'Kurunegala',
  'Anuradhapura',
  'Batticaloa'
] as const;

export const orderStatusLabels: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};
