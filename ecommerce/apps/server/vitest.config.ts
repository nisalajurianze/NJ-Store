import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@njstore/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@njstore/types/': `${path.resolve(__dirname, '../../packages/types/src')}/`,
      '@njstore/utils': path.resolve(__dirname, '../../packages/utils/src/index.ts'),
      '@njstore/utils/': `${path.resolve(__dirname, '../../packages/utils/src')}/`
    }
  },
  test: {
    fileParallelism: false,
    setupFiles: ['./src/__tests__/testSetup.ts']
  }
});
