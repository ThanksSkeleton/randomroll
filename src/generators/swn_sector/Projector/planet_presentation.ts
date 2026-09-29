import type { Planet } from '../BaseDTO/merged_schema';
import {
  PLANET_COLOR_BY_COMPOSITION,
  type PlanetColor,
} from '../Data/Projection/planet_presentation';

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
