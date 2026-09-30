import { test as setup } from '@playwright/test';

setup('validate e2e credentials are configured', async () => {
  setup.skip(!process.env.E2E_OWNER_EMAIL || !process.env.E2E_OWNER_PASSWORD, 'set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run authenticated flows');
});
