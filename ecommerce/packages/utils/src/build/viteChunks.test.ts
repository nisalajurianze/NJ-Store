import { describe, expect, it } from 'vitest';
import { createVendorManualChunks, getNodeModulePackageName } from './viteChunks.js';

describe('vite chunk helpers', () => {
  it('extracts package names from node_modules paths', () => {
    expect(getNodeModulePackageName('/repo/node_modules/react/index.js')).toBe('react');
    expect(getNodeModulePackageName('/repo/node_modules/@tanstack/react-query/build/modern/index.js')).toBe('@tanstack/react-query');
    expect(getNodeModulePackageName('C:\\repo\\node_modules\\react-router-dom\\dist\\index.mjs')).toBe('react-router-dom');
    expect(getNodeModulePackageName('/repo/src/main.tsx')).toBeUndefined();
  });

  it('matches exact and scoped package groups without substring collisions', () => {
    const manualChunks = createVendorManualChunks({
      'react-vendor': ['react', 'react-dom', 'react-router-dom'],
      'data-vendor': ['@tanstack/*', 'axios']
    });

    expect(manualChunks('/repo/node_modules/react/index.js')).toBe('react-vendor');
    expect(manualChunks('/repo/node_modules/@tanstack/react-query/build/modern/index.js')).toBe('data-vendor');
    expect(manualChunks('/repo/node_modules/react-hot-toast/dist/index.mjs')).toBe('vendor');
    expect(manualChunks('/repo/src/pages/Home.tsx')).toBeUndefined();
  });
});
