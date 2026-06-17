const withOpacity = (token) => `rgb(var(${token}) / <alpha-value>)`;

export const primarySansStack = ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'];

export const sharedThemeExtend = {
  colors: {
    navy: withOpacity('--color-navy-rgb'),
    'navy-light': withOpacity('--color-navy-light-rgb'),
    dark: withOpacity('--color-dark-rgb'),
    'dark-light': withOpacity('--color-dark-light-rgb'),
    gold: withOpacity('--color-gold-rgb'),
    'gold-light': withOpacity('--color-gold-light-rgb'),
    'gold-dark': withOpacity('--color-gold-dark-rgb')
  },
  fontFamily: {
    display: primarySansStack,
    body: primarySansStack,
    mono: ['"JetBrains Mono"', 'monospace']
  },
  boxShadow: {
    gold: '0 18px 40px rgba(0, 0, 0, 0.28)'
  },
  keyframes: {
    'logo-pulse': {
      '0%, 100%': { transform: 'scale(1)', opacity: '1', filter: 'drop-shadow(0 0 16px rgba(212,175,55,0.3))' },
      '50%': { transform: 'scale(0.92)', opacity: '0.8', filter: 'drop-shadow(0 0 24px rgba(212,175,55,0.6))' }
    }
  },
  animation: {
    'logo-pulse': 'logo-pulse 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite'
  }
};

export const storefrontBackgroundImages = {
  'gold-gradient': 'linear-gradient(90deg, rgb(var(--color-gold-rgb)) 0%, rgb(var(--color-gold-dark-rgb)) 100%)',
  'hero-mesh': 'var(--theme-hero-surface)'
};
