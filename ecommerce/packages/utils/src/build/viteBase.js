import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { createVendorManualChunks } from './viteChunks.js';

const defaultOptimizeDeps = ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'axios', 'framer-motion', 'lucide-react'];

const sourceExtensions = ['.ts', '.tsx'];

const isBundleAnalyzeEnabled = () =>
  ['ANALYZE', 'BUNDLE_ANALYZE', 'VITE_BUNDLE_ANALYZE'].some((key) => process.env[key] === 'true');

const createFontPreloadPlugin = () => {
  let base = '/';

  return {
    name: 'njstore-font-preload',
    apply: 'build',
    configResolved(config) {
      base = config.base || '/';
    },
    transformIndexHtml(_html, ctx) {
      if (!ctx.bundle) {
        return [];
      }

      const hrefPrefix = base === './' || base === '' ? base : base.endsWith('/') ? base : `${base}/`;
      return Object.values(ctx.bundle)
        .filter(
          (asset) =>
            asset.type === 'asset' &&
            typeof asset.fileName === 'string' &&
            /^assets\/(?:inter-latin-(?:400|500|600|700)-normal|jetbrains-mono-latin-500-normal)-.+\.woff2$/.test(asset.fileName)
        )
        .map((asset) => ({
          tag: 'link',
          attrs: {
            rel: 'preload',
            as: 'font',
            type: 'font/woff2',
            href: `${hrefPrefix}${asset.fileName}`,
            crossorigin: ''
          },
          injectTo: 'head'
        }));
    }
  };
};

const createWorkspaceSourceJsResolver = (workspaceRoot) => ({
  name: 'njstore-workspace-source-js-resolver',
  enforce: 'pre',
  resolveId(source, importer) {
    if (!importer || !source.endsWith('.js') || !source.startsWith('.')) {
      return null;
    }

    const normalizedImporter = importer.split('?')[0].replace(/\\/g, '/');
    const normalizedWorkspaceRoot = workspaceRoot.replace(/\\/g, '/');

    if (!normalizedImporter.startsWith(`${normalizedWorkspaceRoot}/packages/`)) {
      return null;
    }

    const requestedPath = path.resolve(path.dirname(importer.split('?')[0]), source);
    const requestedWithoutExtension = requestedPath.slice(0, -path.extname(requestedPath).length);
    const matchingSource = sourceExtensions
      .map((extension) => `${requestedWithoutExtension}${extension}`)
      .find((candidate) => fs.existsSync(candidate));

    return matchingSource ?? null;
  }
});

export const createViteAppConfig = ({
  appDir,
  port,
  manualChunks,
  optimizeDeps = defaultOptimizeDeps,
  deferredModulePreloadChunks = []
}) =>
  defineConfig({
    plugins: [
      createWorkspaceSourceJsResolver(path.resolve(appDir, '../..')),
      react(),
      createFontPreloadPlugin(),
      isBundleAnalyzeEnabled()
        ? visualizer({
            filename: path.resolve(appDir, 'dist/bundle-report.html'),
            template: 'treemap',
            gzipSize: true,
            brotliSize: true,
            open: false
          })
        : null
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(appDir, './src'),
        '@njstore/types': path.resolve(appDir, '../../packages/types/src/index.ts'),
        '@njstore/utils/browserActions': path.resolve(appDir, '../../packages/utils/src/browserActions.ts'),
        '@njstore/utils/browserStorage': path.resolve(appDir, '../../packages/utils/src/browserStorage.ts'),
        '@njstore/utils/businessDays': path.resolve(appDir, '../../packages/utils/src/businessDays.ts'),
        '@njstore/utils/cn': path.resolve(appDir, '../../packages/utils/src/cn.ts'),
        '@njstore/utils/formatters': path.resolve(appDir, '../../packages/utils/src/formatters.ts'),
        '@njstore/utils/motion': path.resolve(appDir, '../../packages/utils/src/motion.ts'),
        '@njstore/utils/productSnapshots': path.resolve(appDir, '../../packages/utils/src/productSnapshots.ts'),
        '@njstore/utils/safeHtml': path.resolve(appDir, '../../packages/utils/src/safeHtml.ts'),
        '@njstore/utils/schemas': path.resolve(appDir, '../../packages/utils/src/schemas.ts'),
        '@njstore/utils/shipping': path.resolve(appDir, '../../packages/utils/src/shipping.ts'),
        '@njstore/utils': path.resolve(appDir, '../../packages/utils/src/index.ts'),
        '@njstore/ui': path.resolve(appDir, '../../packages/ui/src/index.ts')
      }
    },
    server: {
      host: '0.0.0.0',
      port,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true
        },
        '/socket.io': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
          ws: true
        }
      }
    },
    optimizeDeps: {
      include: optimizeDeps
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      modulePreload: deferredModulePreloadChunks.length
        ? {
            resolveDependencies: (_url, deps) =>
              deps.filter((dependency) => !deferredModulePreloadChunks.some((chunkName) => dependency.includes(chunkName)))
          }
        : undefined,
      rollupOptions: {
        output: {
          manualChunks: createVendorManualChunks(manualChunks)
        }
      }
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts'
    }
  });
