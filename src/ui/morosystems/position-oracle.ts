import { expect } from '@playwright/test';
import type { CareerPage, JobPosition } from './career.page';

/**
 * Reads the unfiltered list, which the expected filter results are derived from. A broken selector would yield
 * empty data that trivially matches an empty result, so every position must have a title and a location.
 */
export async function readUnfilteredPositions(careerPage: CareerPage): Promise<JobPosition[]> {
  const positions = await careerPage.getPositions();

  expect(positions, 'Precondition: open positions are listed').not.toHaveLength(0);
  for (const { title, locations } of positions) {
    expect(title, 'Precondition: position title').not.toBe('');
    expect(locations, `Precondition: locations of "${title}"`).not.toHaveLength(0);
  }
  return positions;
}

/** Positions located in the city – the expected result of filtering by it, which may also be empty or complete. */
export const positionsIn = (positions: JobPosition[], city: string): JobPosition[] =>
  positions.filter(({ locations }) => locations.includes(city));

/**
 * A city whose filter hides some positions, preferably one that still shows others. Narrowing the list first makes
 * showing all positions again an observable change. The offered positions change over time, so the city is chosen
 * from the data; only when every position is in every city is there none.
 */
export function narrowingCity(positions: JobPosition[], cities: string[]): string {
  const narrowing = cities.filter((city) => positionsIn(positions, city).length < positions.length);
  const city = narrowing.find((candidate) => positionsIn(positions, candidate).length > 0) ?? narrowing[0];
  if (city === undefined) {
    throw new Error(
      `Precondition: none of the cities ${cities.join(', ')} narrows the list of open positions`,
    );
  }
  return city;
}
