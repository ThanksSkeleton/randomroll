import type { BulkComposition, Planet } from './merged_schema';

export type PlanetColor =
  | 'yellow'
  | 'black'
  | 'dark-green'
  | 'gray'
  | 'red'
  | 'blue'
  | 'light-brown'
  | 'orange'
  | 'dark-blue'
  | 'green';

/** Presentation colors follow the reviewed world-attributes palette. */
export const PLANET_COLOR_BY_COMPOSITION: Readonly<Record<BulkComposition, PlanetColor>> = {
  Sulfur: 'yellow',
  Carbon: 'black',
  Magnesium: 'dark-green',
  'Calcium-Aluminum': 'gray',
  Iron: 'red',
  Water: 'blue',
  Silicon: 'light-brown',
  'Jovian Gas': 'orange',
  'Neptunian Gas': 'dark-blue',
};

/** Inhabited worlds intentionally override their physical composition color. */
export function planetColor(
  planet: Pick<Planet, 'BulkComposition' | 'InhabitedInfo'>,
): PlanetColor {
  return planet.InhabitedInfo !== false
    ? 'green'
    : PLANET_COLOR_BY_COMPOSITION[planet.BulkComposition];
}

export function planetColorClass(
  planet: Pick<Planet, 'BulkComposition' | 'InhabitedInfo'>,
): string {
  return `planet-color-${planetColor(planet)}`;
}
