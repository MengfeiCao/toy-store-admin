import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    E2E_OWNER_EMAIL: 'owner.e2e@toy-store.local',
    E2E_OWNER_PASSWORD: 'ToyStoreE2E!2026',
    E2E_STAFF_EMAIL: 'staff.e2e@toy-store.local',
    E2E_STAFF_PASSWORD: 'ToyStoreE2E!2026',
    ...(process.platform === 'darwin' ? { PLAYWRIGHT_BROWSER_CHANNEL: 'chrome' } : {}),
  },
});

process.exit(result.status ?? 1);
