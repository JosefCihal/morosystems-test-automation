import type { Locator, Page } from '@playwright/test';
import { env } from '@config/env';
import { dismissGoogleConsentAutomatically } from './consent';

export class GoogleSearchPage {
  readonly searchBox: Locator;

  constructor(private readonly page: Page) {
    // `name="q"` is Google's long-standing search form parameter, whereas the accessible name is localised.
    this.searchBox = page.locator('textarea[name="q"], input[name="q"]');
  }

  async open(): Promise<void> {
    await dismissGoogleConsentAutomatically(this.page);
    await this.page.goto(env.googleUrl);
  }

  async search(term: string): Promise<void> {
    await this.searchBox.fill(term);
    await this.searchBox.press('Enter');
  }
}
