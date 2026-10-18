import { expect, test } from '@fixtures/ui.fixture';

/**
 * Component-level screenshots of parts of the live website that change rarely.
 * Volatile elements (sticky header, cookie banner and badge) are hidden by `screenshot.css`, see playwright.config.ts.
 * Baselines are OS-specific (macOS for local runs, Linux for CI); see the README for how to update them.
 */
test.describe('Visual – MoroSystems website', () => {
  test('career page – position filter toolbar', async ({ page, careerPage }) => {
    await careerPage.open();
    // A screenshot needs the web fonts and icons, so the page must finish loading.
    await page.waitForLoadState();

    await expect(careerPage.filterToolbar).toHaveScreenshot('career-filter-toolbar.png');
  });

  test('home page – footer with office addresses', async ({ page, homePage }) => {
    // The copyright year changes every January.
    const copyright = homePage.footer.getByText(/@ 2006 - \d{4}/);
    await homePage.open();
    await page.waitForLoadState();
    // A mask locator that matches nothing is silently ignored, so make sure it still matches.
    await expect(copyright).toBeVisible();
    // The logos are lazy-loaded: bring them into view and wait until they are loaded.
    await homePage.footer.scrollIntoViewIfNeeded();
    for (const logo of await homePage.footer.locator('img').all()) {
      await expect(logo).toHaveJSProperty('complete', true);
    }

    await expect(homePage.footer).toHaveScreenshot('footer.png', { mask: [copyright] });
  });
});
