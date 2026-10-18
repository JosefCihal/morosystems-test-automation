import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class HomePage extends BasePage {
  readonly path = '/';

  readonly mainHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.mainHeading = page.getByRole('heading', { level: 1 });
  }
}
