import { createViteAppConfig } from '../../packages/utils/src/build/viteBase.js';

export default createViteAppConfig({
  appDir: __dirname,
  port: 5173,
  manualChunks: {
    'react-vendor': ['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler', '@remix-run/router'],
    'data-vendor': ['@tanstack/*', 'axios', 'i18next', 'react-i18next'],
    'icon-vendor': ['lucide-react'],
    'motion-vendor': ['framer-motion'],
    'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
    'toast-vendor': ['react-hot-toast'],
    'socket-vendor': ['socket.io-client', 'engine.io-client', 'socket.io-parser', 'engine.io-parser'],
    'speed-insights-vendor': ['@vercel/speed-insights']
  },
  deferredModulePreloadChunks: ['toast-vendor', 'socket-vendor', 'motion-vendor', 'form-vendor', 'speed-insights-vendor'],
  optimizeDeps: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'axios', 'lucide-react']
});
