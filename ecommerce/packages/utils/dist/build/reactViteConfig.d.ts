import { type UserConfig } from 'vite';
import { type VendorChunkGroups } from './viteChunks.js';
interface ReactAppViteConfigOptions {
    appDir: string;
    port: number;
    manualChunkGroups: VendorChunkGroups;
    optimizeDeps?: string[];
    setupFiles?: string;
    overrides?: UserConfig;
}
export declare const createReactAppViteConfig: ({ appDir, port, manualChunkGroups, optimizeDeps, setupFiles, overrides }: ReactAppViteConfigOptions) => UserConfig | Record<string, any>;
export {};
