import { defineConfig } from '@playwright/test';

const credentialsReady = Boolean(
  process.env.E2E_OWNER_EMAIL && process.env.E2E_OWNER_PASSWORD
  && process.env.E2E_STAFF_EMAIL && process.env.E2E_STAFF_PASSWORD,
);

if (!credentialsReady) throw new Error('请先配置店主和店员 E2E 凭据；本地可运行 npm run setup:e2e 后使用 npm run test:e2e:local');

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
});
