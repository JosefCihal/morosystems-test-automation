import type { Locator, Page, Response } from '@playwright/test';

/** Cookie consent banner of morosystems.cz (CookieScript, loaded by Google Tag Manager). */
export class CookieBanner {
  /** The CookieScript script, which renders the banner. */
  static readonly SCRIPT_URL = /cookie-script\.com\/s\//;
  private static readonly ROOT_ID = 'cookiescript_injected';

  readonly root: Locator;
  readonly rejectOptionalButton: Locator;

  constructor(page: Page) {
    this.root = page.locator(`#${CookieBanner.ROOT_ID}`);
    this.rejectOptionalButton = this.root.getByRole('button', { name: 'Pouze nutné', exact: true });
  }

  /**
   * Whether the CookieScript script renders the banner. CookieScript shows the banner only in some regions:
   * elsewhere – e.g. to US-hosted GitHub runners – it serves a short script without it.
   */
  static async isRenderedBy(script: Response): Promise<boolean> {
    return (await script.text()).includes(CookieBanner.ROOT_ID);
  }

  /** Consents only to the necessary cookies – the most privacy-friendly option. */
  async rejectOptionalCookies(): Promise<void> {
    await this.rejectOptionalButton.click();
  }
}
