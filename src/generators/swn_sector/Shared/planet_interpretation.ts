import type { InhabitedInfo, Planet, StarType, Temperature } from '../BaseDTO/merged_schema';
import { resolveAtmosphere } from './atmosphere_interpretation';

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

export function planetHabitability(
  planet: Planet,
  starHabitability: number,
  temperature: Temperature,
): number | null {
  if (planet.InhabitedInfo === false) return null;
  return Math.min(
    starHabitability,
    resolveAtmosphere(planet.Atmosphere).HabRating,
    TEMPERATURE_HAB[temperature],
    TERRAN_BIOSPHERE_HAB[planet.InhabitedInfo.TerranBiosphere],
    SIZE_HAB[planet.Size],
    BULK_COMPOSITION_HAB[planet.BulkComposition],
  );
}

export const TEMPERATURE_HAB: Readonly<Record<Temperature, number>> = {
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
