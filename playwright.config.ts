import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';
import { CONSENT_STORAGE_STATE } from './src/config/storage-state';

const isCI = !!process.env.CI;

/** Settings shared by all browser projects: a Czech visitor of the website (the locale also sets Google's language). */
const webUse = {
  baseURL: env.webBaseUrl,
  locale: 'cs-CZ',
  timezoneId: 'Europe/Prague',
};

/** Browser projects start with the cookie consent saved by the `setup` project, so the banner never shows up. */
const webUseWithConsent = {
  ...webUse,
  storageState: CONSENT_STORAGE_STATE,
};

export default defineConfig({
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : '50%',
  timeout: 60_000,
  // Stops a CI run in time to write and upload the report, even if many tests time out.
  globalTimeout: isCI ? 15 * 60_000 : 0,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      stylePath: './tests/visual/screenshot.css',
    },
  },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    // Results table on the page of a GitHub Actions run; does nothing elsewhere.
    ['./src/reporters/job-summary.reporter.ts'],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // API test step 1: the backend under test is installed (first run only) and started automatically.
  // Locally, an already running backend is reused.
  webServer: {
    command: 'npm run backend:start',
    url: new URL('/v3/api-docs', env.apiBaseUrl).href,
    reuseExistingServer: !isCI,
    // Includes cloning and installing the backend on the first run.
    timeout: 120_000,
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      // The local backend is deterministic: a retry would only turn an intermittent defect into a pass.
      retries: 0,
      use: {
        baseURL: env.apiBaseUrl,
        extraHTTPHeaders: { Accept: 'application/json' },
      },
    },
    {
      // Gives cookie consent on the website once and saves it for the browser projects (see tests/setup).
      name: 'setup',
      testDir: './tests/setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], ...webUse },
    },
    {
      name: 'chromium',
      testDir: './tests/ui',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], ...webUseWithConsent },
    },
    {
      name: 'firefox',
      testDir: './tests/ui',
      dependencies: ['setup'],
      use: { ...devices['Desktop Firefox'], ...webUseWithConsent, channel: env.firefoxChannel },
    },
    {
      name: 'webkit',
      testDir: './tests/ui',
      dependencies: ['setup'],
      use: { ...devices['Desktop Safari'], ...webUseWithConsent },
    },
    {
      // Screenshot baselines are browser- and OS-specific, so visual tests use a single reference browser.
      name: 'visual',
      testDir: './tests/visual',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], ...webUseWithConsent },
    },
  ],
});
