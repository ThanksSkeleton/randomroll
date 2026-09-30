import type { InhabitedInfo, Planet, StarType } from '../BaseDTO/merged_schema';

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
