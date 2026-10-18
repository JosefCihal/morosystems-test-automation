import { existsSync } from 'node:fs';

// Optional local overrides (see `.env.example`). Real environment variables take precedence.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

/** Environment variable; an empty value counts as not set, so `-e NAME=` can switch an override off. */
const variable = (name: string): string | undefined => {
  const value = process.env[name];
  return value === '' ? undefined : value;
};

/** Central place for environment-specific configuration. */
export const env = {
  /** Base URL of the MoroSystems todo backend (https://github.com/morosystems/todo-be). */
  apiBaseUrl: variable('API_BASE_URL') ?? 'http://localhost:8080',
  /** Base URL of the MoroSystems corporate website. */
  webBaseUrl: variable('WEB_BASE_URL') ?? 'https://www.morosystems.cz',
  /** Entry point of the GUI end-to-end scenario. */
  googleUrl: variable('GOOGLE_URL') ?? 'https://www.google.com',
  /**
   * Firefox for the `firefox` project: Playwright's own build by default, or `moz-firefox` for the installed Firefox
   * (driven through WebDriver BiDi, experimental in Playwright). Useful when Playwright's build does not start on the OS.
   */
  firefoxChannel: variable('FIREFOX_CHANNEL'),
} as const;
