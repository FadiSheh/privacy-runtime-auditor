import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    headless: true,
  },
  webServer: {
    command: 'cd /home/fshehadeh/Documents/PRA/apps/frontend && NEXT_PUBLIC_API_URL=http://127.0.0.1:3999 npm run build && NEXT_PUBLIC_API_URL=http://127.0.0.1:3999 npm run start -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
