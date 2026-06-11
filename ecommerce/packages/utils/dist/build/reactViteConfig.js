import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, mergeConfig } from 'vite';
import { createVendorManualChunks } from './viteChunks.js';
export const createReactAppViteConfig = ({ appDir, port, manualChunkGroups, optimizeDeps = ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'axios', 'framer-motion', 'lucide-react'], setupFiles = './src/test/setup.ts', overrides }) => {
    const manualChunks = createVendorManualChunks(manualChunkGroups);
    const baseConfig = defineConfig({
        plugins: [react()],
        resolve: {
            alias: {
                '@': path.resolve(appDir, './src'),
                '@njstore/types': path.resolve(appDir, '../../packages/types/src/index.ts'),
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
            rollupOptions: {
                output: {
                    manualChunks
                }
            }
        },
        test: {
            environment: 'jsdom',
            setupFiles
        }
    });
    return overrides ? mergeConfig(baseConfig, overrides) : baseConfig;
};
