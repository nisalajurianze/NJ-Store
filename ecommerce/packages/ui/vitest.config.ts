import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@njstore/utils/cn': path.resolve(__dirname, '../utils/src/cn.ts'),
      '@njstore/utils/motion': path.resolve(__dirname, '../utils/src/motion.ts'),
      '@njstore/utils': path.resolve(__dirname, '../utils/src/index.ts'),
      '@njstore/utils/': `${path.resolve(__dirname, '../utils/src')}/`
    }
  },
  test: {
    environment: 'jsdom'
  }
});
