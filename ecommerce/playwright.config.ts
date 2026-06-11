import { defineConfig } from '@playwright/test';

const resolvedBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5010';
const baseURL = new URL(resolvedBaseUrl).toString().replace(/\/$/, '');
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === 'true';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  outputDir: './test-results',
  timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run dev:once --workspace @njstore/server',
    url: `${baseURL}/api/v1/health`,
    reuseExistingServer,
    timeout: 180_000,
    env: {
      NODE_ENV: 'development',
      PORT: String(new URL(baseURL).port || 80),
      MONGO_URI:
        process.env.PLAYWRIGHT_MONGO_URI ??
        'mongodb://njstore:njstore-dev-mongo-password@127.0.0.1:27017/njstore?authSource=admin&replicaSet=rs0',
      DEV_MEMORY_MONGO_FALLBACK: 'true',
      DEV_SEED_MEMORY_MONGO: 'true',
      SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD ?? 'Password@123',
      SEED_CUSTOMER_PASSWORD: process.env.SEED_CUSTOMER_PASSWORD ?? 'Password@123'
    }
  }
});
