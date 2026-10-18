import { env } from '@config/env';
import { expect, test } from '@fixtures/ui.fixture';
import { positionsIn, readUnfilteredPositions } from '@ui/morosystems/position-oracle';

const SEARCH_TERM = 'MoroSystems';
/** The result to click in step 5, as named in the test case (the title of the MoroSystems home page). */
const RESULT_TITLE = 'MoroSystems - smysluplná IT řešení a technologické inovace';
const PREFERRED_CITY = 'Brno';

test.describe('GUI – from Google search to MoroSystems open positions', () => {
  // Repeated searches from the same address make Google show a CAPTCHA, so a failure is reported without retries.
  test.describe.configure({ retries: 0 });

  test(
    'user finds MoroSystems on Google and filters open positions by city',
    { annotation: { type: 'test case', description: 'GUI Testing – steps 1–7' } },
    async ({ page, headless, googleSearchPage, googleResultsPage, homePage, careerPage }) => {
      test.slow(!headless, 'Leaves time to solve a CAPTCHA by hand');
      const moroSystemsResult = googleResultsPage.resultTitled(RESULT_TITLE);

      await test.step('1–2. Open the browser and navigate to Google', async () => {
        await googleSearchPage.open();
        await expect(googleSearchPage.searchBox).toBeVisible();
      });

      await test.step(`3. Search for "${SEARCH_TERM}"`, async () => {
        await googleSearchPage.search(SEARCH_TERM);
        await googleResultsPage.waitForResultsOrCaptcha();
      });

      test.skip(
        await googleResultsPage.isBlockedByCaptcha(),
        'Google responded with a CAPTCHA ("unusual traffic"), which must not be bypassed. ' +
          'Run the test headed (--headed) to solve it by hand.',
      );

      await test.step('4. Validate that the search results page is displayed', async () => {
        await expect(page).toHaveURL((url) => url.searchParams.get('q') === SEARCH_TERM);
        await expect(page).toHaveTitle(new RegExp(`^${SEARCH_TERM}\\b`));
        await expect(googleResultsPage.results).toBeVisible();
      });

      await test.step('Validate that the link to the MoroSystems website is present in the results', async () => {
        await expect(moroSystemsResult).toBeVisible();
        await expect(moroSystemsResult).toContainText(env.webBaseUrl);
      });

      await test.step('5. Navigate to the MoroSystems website', async () => {
        await moroSystemsResult.click();
        await expect(page).toHaveURL((url) => url.origin === new URL(env.webBaseUrl).origin);
        await expect(page).toHaveTitle(RESULT_TITLE);
      });

      await test.step('6. Visit the "Kariéra" page', async () => {
        await homePage.navigation.openCareer();
        await expect(page).toHaveURL(new URL(careerPage.path, env.webBaseUrl).href);
        await expect(careerPage.positionsHeading).toBeVisible();
        // The city filter is driven by a script at the end of the page, so the whole document must be parsed first.
        await page.waitForLoadState('domcontentloaded');
      });

      await test.step(`7. Filter open positions by "${PREFERRED_CITY}" and validate the results`, async () => {
        await expect(careerPage.positions.first()).toBeVisible();
        // The expected result comes from the unfiltered list, so the check catches both extra and missing positions.
        const expectedPositions = positionsIn(await readUnfilteredPositions(careerPage), PREFERRED_CITY);

        await careerPage.filterByCity(PREFERRED_CITY);

        await expect(careerPage.cityFilter).toHaveText(PREFERRED_CITY);
        await expect.poll(() => careerPage.getPositions()).toEqual(expectedPositions);
      });
    },
  );
});
