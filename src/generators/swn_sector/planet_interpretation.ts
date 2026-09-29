import type { InhabitedInfo, Planet, StarType } from './merged_schema';

/** Deterministic interpretations of canonical planet and star facts. */
export const STAR_HABITABILITY: Readonly<Record<StarType, number>> = {
  'A-type': 1,
  'F-type': 2,
  'G-type': 3,
  'K-type': 3,
  'M-type': 2,
  Giant: 1,
  'White dwarf': 0,
  'Neutron star': 0,
  'Stellar-mass black hole': 0,
};

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

export function planetHabitability(planet: Planet, starHabitability: number): number | null {
  if (planet.InhabitedInfo === false) return null;
  return Math.min(
    starHabitability,
    ATMOSPHERE_HAB[planet.Atmosphere],
    TEMPERATURE_HAB[planet.Temperature],
    TERRAN_BIOSPHERE_HAB[planet.InhabitedInfo.TerranBiosphere],
    SIZE_HAB[planet.Size],
    BULK_COMPOSITION_HAB[planet.BulkComposition],
  );
}

export const TECH_LEVEL: Readonly<Record<InhabitedInfo['TechLevel'], number>> = {
  'Neolithic-level technology': 0,
  'Medieval technology': 1,
  'Early Industrial Age tech': 2,
  'Tech like that of present-day Earth': 3,
  'Modern postech': 4,
  'Postech with specialties': 4.1,
  'Pretech with surviving infrastructure': 5,
};

export const ATMOSPHERE_HAB: Readonly<Record<Planet['Atmosphere'], number>> = {
  Vacuum: 0,
  Corrosive: 0,
  Invasive: 0,
  'Corrosive+Invasive': 0,
  'Inert gas': 0,
  'Breathable: Thin/Thick': 2,
  Breathable: 3,
};

export const TEMPERATURE_HAB: Readonly<Record<Planet['Temperature'], number>> = {
  Cryogenic: 0,
  Deepfrozen: 1,
  Polar: 1,
  Subarctic: 2,
  Boreal: 3,
  Alpine: 3,
  'Temperate (chilly)': 3,
  Temperate: 3,
  'Temperate (warm)': 3,
  Mediterranean: 3,
  Subtropical: 3,
  Equatorial: 2,
  Infernal: 1,
  Scorching: 1,
  Furance: 0,
};

export const TERRAN_BIOSPHERE_HAB: Readonly<Record<InhabitedInfo['TerranBiosphere'], number>> = {
  None: 0,
  Microbial: 1,
  Limited: 2,
  Significant: 3,
  Engineered: 3,
};

export const SIZE_HAB: Readonly<Record<Planet['Size'], number>> = {
  Luna: 1,
  Mars: 2,
  Earth: 3,
  'Super-Earth': 2,
  Neptune: 0,
  Jupiter: 0,
};

export const BULK_COMPOSITION_HAB: Readonly<Record<Planet['BulkComposition'], number>> = {
  Sulfur: 1,
  Carbon: 1,
  Magnesium: 1,
  'Calcium-Aluminum': 1,
  Iron: 1,
  Water: 2,
  Silicon: 3,
  'Jovian Gas': 0,
  'Neptunian Gas': 0,
};
