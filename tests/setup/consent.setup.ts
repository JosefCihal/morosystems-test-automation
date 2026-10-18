import { CONSENT_STORAGE_STATE } from '@config/storage-state';
import { expect, test } from '@fixtures/ui.fixture';
import { CookieBanner } from '@ui/morosystems/cookie-banner.component';

/** Saves the browser state after the setup – also when there was nothing to consent to and the setup was skipped. */
const setup = test.extend<{ savedStorageState: undefined }>({
  savedStorageState: [
    async ({ page }, use) => {
      await use(undefined);
      await page.context().storageState({ path: CONSENT_STORAGE_STATE });
    },
    { auto: true },
  ],
});

/**
 * The cookie banner appears asynchronously after page load and overlays the page, so it could interrupt any
 * interaction (e.g. close a hover menu or a drop-down). Consent is therefore given once here and the browser
 * projects start with the saved state, in which the banner is not shown at all.
 */
setup('consent to necessary cookies only on morosystems.cz', async ({ page, homePage }) => {
  const { cookieBanner } = homePage;
  const cookieScript = page.waitForResponse(CookieBanner.SCRIPT_URL);
  await homePage.open();
  setup.skip(
    !(await CookieBanner.isRenderedBy(await cookieScript)),
    'CookieScript shows no cookie banner in this region (e.g. to US-hosted CI runners), so there is nothing to consent to',
  );

  // The banner shows up only after CookieScript's cross-domain consent lookup (a third-party request) answers.
  // That request occasionally never does, and the banner then never appears, so the page is loaded again.
  await expect(async () => {
    await homePage.open();
    await expect(cookieBanner.rejectOptionalButton).toBeVisible();
  }).toPass({ timeout: 50_000 });

  await cookieBanner.rejectOptionalCookies();

  await expect(cookieBanner.root).toBeHidden();
});
