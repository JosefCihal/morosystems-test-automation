import { test, type Locator, type Page } from '@playwright/test';

/** Time a person has to solve a CAPTCHA by hand in a headed browser. */
const MANUAL_CAPTCHA_TIMEOUT_MS = 120_000;

export class GoogleResultsPage {
  /** Main column of the results page: organic results, and possibly ads or a map. */
  readonly results: Locator;
  /** Organic results: links with a title. Ads and the map are in ARIA regions of their own, organic results are not. */
  private readonly organicResults: Locator;
  /** Google answers suspected bot traffic with a CAPTCHA page ("unusual traffic") instead of the results. */
  private readonly captchaChallenge: Locator;

  constructor(
    private readonly page: Page,
    private readonly headless: boolean,
  ) {
    this.results = page.locator('#search');
    this.organicResults = this.results.locator('a:has(h3):not([role="region"] a)');
    this.captchaChallenge = page.locator('#captcha-form');
  }

  /** Organic result with the given title – Google shows the page title as the result's heading. */
  resultTitled(title: string): Locator {
    return this.organicResults
      .filter({ has: this.page.getByRole('heading', { name: title, exact: true }) })
      .first();
  }

  /**
   * Waits until Google shows either the results or a CAPTCHA. Checking the URL is not enough:
   * Google may load `/search` first and only then redirect to the CAPTCHA page.
   */
  async waitForResultsOrCaptcha(): Promise<void> {
    await this.results.or(this.captchaChallenge).waitFor();
  }

  /**
   * True when a CAPTCHA blocks the results in a headless browser – it must not be bypassed. In a headed browser,
   * a person can solve it by hand: this waits up to two minutes for the results and fails if nobody does.
   */
  async isBlockedByCaptcha(): Promise<boolean> {
    if (!(await this.captchaChallenge.isVisible())) {
      return false;
    }
    if (this.headless) {
      return true;
    }

    await test.step('Solve the CAPTCHA by hand in the browser window', () =>
      this.results.waitFor({ timeout: MANUAL_CAPTCHA_TIMEOUT_MS }));

    return false;
  }
}
