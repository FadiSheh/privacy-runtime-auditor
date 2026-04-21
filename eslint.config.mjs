import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  ...compat.extends('eslint:recommended', 'plugin:@typescript-eslint/recommended'),
  ...compat.extends('next/core-web-vitals').map((config) => ({
    ...config,
    files: ['apps/frontend/src/**/*.{ts,tsx}'],
  })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
