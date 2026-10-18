import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import playwright from 'eslint-plugin-playwright';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['.backend/', 'playwright-report/', 'test-results/', 'src/api/todo/generated/'],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['tests/**/*.ts', 'src/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      // Conditional skips are legitimate for environment preconditions (e.g. a Google CAPTCHA).
      'playwright/no-skipped-test': ['error', { allowConditional: true }],
      // Custom assertion helpers count as assertions.
      'playwright/expect-expect': ['warn', { assertFunctionNames: ['expectToFitViewportWidth'] }],
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly', fetch: 'readonly', URL: 'readonly' },
    },
  },
  prettier,
);
