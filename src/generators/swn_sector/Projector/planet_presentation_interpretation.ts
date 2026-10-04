import type { InhabitedInfo, Planet, StarType, Temperature } from '../BaseDTO/merged_schema';
import rawPlanetValues from '../Data/Raw/Details/planet_values.json';

const SIZE_VALUES = rawPlanetValues.size as Record<
  Planet['Size'],
  { massEarth: number; gravityMps2: number | null }
>;
const TEMPERATURE_VALUES = rawPlanetValues.temperature as Record<
  Temperature,
  { label: string; celsius: number; fahrenheit: number }
>;

export function planetSizeScan(size: Planet['Size']): { summary: string; lines: string[] } {
  const { massEarth, gravityMps2 } = SIZE_VALUES[size];
  return {
    summary: gravityMps2 === null ? 'Planet: No Surface' : `Planet: ${gravityMps2} m/s²`,
    lines: [`${massEarth} M⊕`, `${size}-Class`],
  };
}

export function planetTemperatureScan(
  temperature: Temperature,
  au: number,
): {
  summary: string;
  lines: string[];
} {
  const { label, celsius, fahrenheit } = TEMPERATURE_VALUES[temperature];
  return {
    summary: `Temperature: ${fahrenheit}°F (${celsius}°C)`,
    lines: [`${formatPlanetAu(au)} AU`, `Climate: ${label}`],
  };
}

export const POPULATION_TIER: Readonly<Record<InhabitedInfo['Population'], number>> = {
  'Fewer than 500': 1,
  'Fewer than a million inhabitants': 2,
  'Several million inhabitants': 3,
  'Hundreds of millions of inhabitants': 4,
  'Billions of inhabitants': 5,
};

export function isTidallyLocked(planet: Pick<Planet, 'Orbit'>, starType: StarType): boolean {
  return planet.Orbit.ParentObjectId === null && starType === 'M-type';
}

/** Preserve the existing three-significant-digit AU label. */
export function formatPlanetAu(au: number): string {
  if (!Number.isFinite(au)) return String(au);
  return String(Number(au.toPrecision(3)));
}
