import type { Config } from 'tailwindcss';
import { sharedThemeExtend, storefrontBackgroundImages } from '../../packages/utils/src/build/tailwindTheme.js';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      ...sharedThemeExtend,
      backgroundImage: {
        ...storefrontBackgroundImages
      }
    }
  },
  plugins: []
};

export default config;
