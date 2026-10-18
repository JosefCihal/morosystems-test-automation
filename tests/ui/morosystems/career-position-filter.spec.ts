import { expect, test } from '@fixtures/ui.fixture';
import { ALL_CITIES } from '@ui/morosystems/career.page';
import { narrowingCity, positionsIn, readUnfilteredPositions } from '@ui/morosystems/position-oracle';

/** Every city of the filter. Each is mapped to positions on its own, so a mistake in one would not show in others. */
const CITIES = ['Brno', 'Praha', 'Hradec Králové', 'Bratislava', 'home office'];

test.describe('GUI – career page position filter', () => {
  test.beforeEach(async ({ careerPage }) => {
    await careerPage.open();
    await expect(careerPage.positions.first()).toBeVisible();
  });

  test('offers exactly the known city options', async ({ careerPage }) => {
    // Every option is tested on its own below, so a new one must not go unnoticed.
    await expect(careerPage.cityOptions).toHaveText([ALL_CITIES, ...CITIES]);
  });

  for (const city of CITIES) {
    test(`shows exactly the positions located in "${city}"`, async ({ careerPage }) => {
      const expectedPositions = positionsIn(await readUnfilteredPositions(careerPage), city);

      await careerPage.filterByCity(city);

      await expect(careerPage.cityFilter).toHaveText(city);
      await expect.poll(() => careerPage.getPositions()).toEqual(expectedPositions);
    });
  }

  test(`shows all positions again after selecting "${ALL_CITIES}"`, async ({ careerPage }) => {
    const allPositions = await readUnfilteredPositions(careerPage);
    const city = narrowingCity(allPositions, CITIES);
    await careerPage.filterByCity(city);
    await expect.poll(() => careerPage.getPositions()).toEqual(positionsIn(allPositions, city));

    await careerPage.filterByCity(ALL_CITIES);

    await expect(careerPage.cityFilter).toHaveText(ALL_CITIES);
    await expect.poll(() => careerPage.getPositions()).toEqual(allPositions);
  });
});
