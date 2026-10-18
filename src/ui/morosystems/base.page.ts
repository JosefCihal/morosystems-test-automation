import type { Locator, Page } from '@playwright/test';
import { CookieBanner } from './cookie-banner.component';
import { HeaderNavigation } from './header-navigation.component';

/** Common parts of all pages of the MoroSystems website. */
export abstract class BasePage {
  abstract readonly path: string;

  readonly header: Locator;
  readonly navigation: HeaderNavigation;
  readonly cookieBanner: CookieBanner;
  readonly footer: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole('banner');
    this.navigation = new HeaderNavigation(page, this.header);
    this.cookieBanner = new CookieBanner(page);
    this.footer = page.getByRole('contentinfo');
  }

  /** Opens the page. Waiting for `load` is not needed and would also wait for slow third-party trackers. */
  async open(): Promise<void> {
    await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
  }

  /** Waits until the web fonts in use are loaded: they change the width of text, and with it the layout. */
  async waitForWebFonts(): Promise<void> {
    // Checks the state instead of awaiting `document.fonts.ready`: WebKit occasionally never resolves that promise,
    // although all fonts are loaded.
    await this.page.waitForFunction(() => document.fonts.status === 'loaded');
  }

  /**
   * True when the element and its visible descendants – elements and text – lie within the viewport width. The site
   * clips overflowing content (`overflow: hidden`) instead of letting the page scroll, and a block element takes the
   * width of its parent, so the content itself is measured, not just the element's box. No clipping is taken into
   * account, so content placed off-screen on purpose (an off-canvas menu, a carousel, a skip link) counts as
   * overflow: check elements that contain none. Not inspected: pseudo-elements, SVG drawings (only the box of the
   * `<svg>`), text directly inside `display: contents`, shadow DOM and iframes.
   */
  fitsViewportWidth(element: Locator): Promise<boolean> {
    return element.evaluate((root) => {
      const viewportWidth = document.documentElement.clientWidth;
      const textBox = (text: Node): DOMRect => {
        const range = document.createRange();
        range.selectNodeContents(text);
        return range.getBoundingClientRect();
      };
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode: (node) =>
          node.parentElement instanceof SVGElement ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
      });
      for (let node: Node | null = root; node; node = walker.nextNode()) {
        const owner = node instanceof Element ? node : node.parentElement;
        if (!owner?.checkVisibility({ visibilityProperty: true, opacityProperty: true })) {
          continue;
        }
        const box = node instanceof Element ? node.getBoundingClientRect() : textBox(node);
        const isRendered = box.width > 0 && box.height > 0;
        if (isRendered && (box.left < -0.5 || box.right > viewportWidth + 0.5)) {
          return false;
        }
      }
      return true;
    });
  }
}
