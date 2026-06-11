import { createViteAppConfig } from '../../packages/utils/src/build/viteBase.js';

export default createViteAppConfig({
  appDir: __dirname,
  port: 5174,
  manualChunks: {
    'react-vendor': ['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler', '@remix-run/router'],
    'data-vendor': ['@tanstack/*', 'axios', 'i18next', 'react-i18next'],
    'form-vendor': ['zod', 'react-hook-form', '@hookform/resolvers'],
    'ui-vendor': ['framer-motion', 'lucide-react'],
    'toast-vendor': ['react-hot-toast']
  },
  deferredModulePreloadChunks: ['toast-vendor']
});
