import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@pra/shared': resolve(__dirname, 'packages/shared/src'),
      '@pra/utils': resolve(__dirname, 'packages/utils/src'),
      '@pra/db': resolve(__dirname, 'packages/db/src'),
      '@pra/vendor-registry': resolve(__dirname, 'packages/vendor-registry/src'),
      '@pra/rules-engine': resolve(__dirname, 'packages/rules-engine/src'),
      '@pra/policy-parser': resolve(__dirname, 'packages/policy-parser/src'),
      '@pra/report-generator': resolve(__dirname, 'packages/report-generator/src'),
      '@pra/browser-runner': resolve(__dirname, 'packages/browser-runner/src'),
    },
  },
  test: {
    environment: 'node',
    projects: [
      {
        test: {
          name: 'unit',
          include: ['apps/**/*.unit.test.ts', 'packages/**/*.unit.test.ts', 'tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['apps/**/*.integration.test.ts', 'packages/**/*.integration.test.ts', 'tests/integration/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
