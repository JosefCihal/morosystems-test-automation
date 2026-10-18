import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export interface JobPosition {
  title: string;
  locations: string[];
}

/** Label of the city filter option that shows every position. */
export const ALL_CITIES = 'Všechna města';

export class CareerPage extends BasePage {
  readonly path = '/kariera/';

  readonly positionsHeading: Locator;
  readonly filterToolbar: Locator;
  readonly cityFilter: Locator;
  readonly positions: Locator;
  readonly cityOptions: Locator;

  constructor(page: Page) {
    super(page);
    // `#pozice` is the anchor the page itself links to ("Otevřené pozice"), so it is a stable hook.
    const positionsSection = page.locator('#pozice');
    this.positionsHeading = positionsSection.getByRole('heading', { name: 'Koho hledáme' });
    // The filter toolbar and the custom city drop-down have no ARIA roles, so their BEM class names are the most
    // stable selectors available.
    this.filterToolbar = positionsSection.locator('.c-positions__top');
    const cityDropdown = positionsSection.locator('.inp-custom-select');
    this.cityFilter = cityDropdown.locator('.inp-custom-select__select');
    this.cityOptions = cityDropdown.locator('.inp-custom-select__item');
    // Filtered-out positions get `display: none`, and role locators skip hidden elements: only visible positions match.
    this.positions = positionsSection.getByRole('listitem');
  }

  async filterByCity(city: string): Promise<void> {
    await this.cityFilter.click();
    await this.cityOptions.getByText(city, { exact: true }).click();
  }

  /** Positions currently visible in the list. Every card is read at once, so a title never gets another's locations. */
  getPositions(): Promise<JobPosition[]> {
    return this.positions.evaluateAll((cards) =>
      cards.map((card) => ({
        title: card.querySelector<HTMLElement>('.c-positions__name')?.innerText.trim() ?? '',
        locations: (card.querySelector<HTMLElement>('.c-positions__info')?.innerText ?? '')
          .split(',')
          .map((location) => location.trim())
          .filter(Boolean),
      })),
    );
  }
}
