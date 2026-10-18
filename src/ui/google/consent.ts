import type { Page } from '@playwright/test';

/**
 * Google shows its consent screen only in some regions and not on every visit, so instead of an explicit click,
 * a locator handler dismisses it whenever it blocks an action. The most privacy-friendly option is chosen.
 */
export async function dismissGoogleConsentAutomatically(page: Page): Promise<void> {
  await page.addLocatorHandler(page.getByRole('button', { name: /^(Odmítnout vše|Reject all)$/ }), (button) =>
    button.click(),
  );
}
