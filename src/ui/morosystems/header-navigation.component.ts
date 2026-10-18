import type { Locator, Page } from '@playwright/test';

/**
 * Main navigation of morosystems.cz. Its layout depends on the viewport width (breakpoints taken from the site CSS):
 * - up to 999 px:     links are hidden behind the "Menu" (burger) button
 * - 1000 – 1479 px:   "Kariéra" is nested in the "O nás" drop-down that opens on hover
 * - 1480 px and more: "Kariéra" is a top-level link
 */
export class HeaderNavigation {
  static readonly BURGER_MENU_MAX_WIDTH = 999;
  static readonly DROPDOWN_MENU_MAX_WIDTH = 1479;

  private readonly burgerMenuLink: Locator;
  private readonly aboutUsLink: Locator;
  private readonly careerLink: Locator;

  constructor(
    private readonly page: Page,
    header: Locator,
  ) {
    this.burgerMenuLink = header.getByRole('link', { name: 'Menu', exact: true });
    this.aboutUsLink = header.getByRole('link', { name: 'O nás', exact: true });
    // Role locators ignore hidden elements, so this resolves to whichever "Kariéra" link the current layout shows.
    this.careerLink = header.getByRole('link', { name: 'Kariéra', exact: true });
  }

  async openCareer(): Promise<void> {
    const viewportWidth = this.page.viewportSize()?.width ?? Number.POSITIVE_INFINITY;

    if (viewportWidth <= HeaderNavigation.BURGER_MENU_MAX_WIDTH) {
      await this.burgerMenuLink.click();
    } else if (viewportWidth <= HeaderNavigation.DROPDOWN_MENU_MAX_WIDTH) {
      await this.aboutUsLink.hover();
    }
    await this.careerLink.click();
  }
}
