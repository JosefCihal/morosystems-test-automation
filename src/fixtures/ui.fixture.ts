import { test as base } from '@playwright/test';
import { GoogleResultsPage } from '@ui/google/results.page';
import { GoogleSearchPage } from '@ui/google/search.page';
import { CareerPage } from '@ui/morosystems/career.page';
import { HomePage } from '@ui/morosystems/home.page';

interface UiFixtures {
  googleSearchPage: GoogleSearchPage;
  googleResultsPage: GoogleResultsPage;
  homePage: HomePage;
  careerPage: CareerPage;
}

export const test = base.extend<UiFixtures>({
  googleSearchPage: async ({ page }, use) => {
    await use(new GoogleSearchPage(page));
  },
  googleResultsPage: async ({ page, headless }, use) => {
    await use(new GoogleResultsPage(page, headless));
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  careerPage: async ({ page }, use) => {
    await use(new CareerPage(page));
  },
});

export { expect } from '@playwright/test';
