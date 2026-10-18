import type { Locator } from '@playwright/test';
import { env } from '@config/env';
import { expect, test } from '@fixtures/ui.fixture';
import type { BasePage } from '@ui/morosystems/base.page';
import { HeaderNavigation } from '@ui/morosystems/header-navigation.component';

const { BURGER_MENU_MAX_WIDTH, DROPDOWN_MENU_MAX_WIDTH } = HeaderNavigation;
const VIEWPORT_HEIGHT = 800;

/**
 * The layout of the site changes at two breakpoints (see HeaderNavigation). Boundary value analysis: each wider
 * layout is tested at its narrowest width, right above the breakpoint, where it has the least space and breaks
 * most often. A typical phone width covers the burger menu layout.
 */
const VIEWPORTS = [
  { layout: 'burger menu, phone width', width: 375 },
  { layout: 'drop-down menu, narrowest', width: BURGER_MENU_MAX_WIDTH + 1 },
  { layout: 'top-level menu, narrowest', width: DROPDOWN_MENU_MAX_WIDTH + 1 },
];

/** Every element must be visible and lie within the viewport width. */
async function expectToFitViewportWidth(basePage: BasePage, elements: Map<string, Locator>): Promise<void> {
  await basePage.waitForWebFonts();
  for (const [name, element] of elements) {
    await expect(element, `${name} is visible`).toBeVisible();
    await expect
      .poll(() => basePage.fitsViewportWidth(element), { message: `${name} fits the viewport width` })
      .toBe(true);
  }
}

for (const { layout, width } of VIEWPORTS) {
  test.describe(`GUI – responsive layout at ${width} px (${layout})`, () => {
    test.use({ viewport: { width, height: VIEWPORT_HEIGHT } });

    test('home page fits the viewport width', async ({ homePage }) => {
      await homePage.open();

      await expectToFitViewportWidth(
        homePage,
        new Map([
          ['header', homePage.header],
          ['heading', homePage.mainHeading],
          ['footer', homePage.footer],
        ]),
      );
    });

    test('career page is reachable from the main navigation and fits the viewport width', async ({
      page,
      homePage,
      careerPage,
    }) => {
      await homePage.open();

      await homePage.navigation.openCareer();

      await expect(page).toHaveURL(new URL(careerPage.path, env.webBaseUrl).href);
      await expect(careerPage.positions.first()).toBeVisible();
      const positions = await careerPage.positions.all();
      await expectToFitViewportWidth(
        careerPage,
        new Map<string, Locator>([
          ['heading', careerPage.positionsHeading],
          ['city filter', careerPage.cityFilter],
          ...positions.map((position, index) => [`position ${index + 1}`, position] as const),
        ]),
      );
    });
  });
}
