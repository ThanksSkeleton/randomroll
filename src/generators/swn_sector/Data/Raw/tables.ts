import type { InhabitedInfo, Planet } from '../../BaseDTO/merged_schema';

export const SIZE_RANK: Readonly<Record<Planet['Size'], number>> = {
  Luna: 1,
  Mars: 2,
  Earth: 3,
  'Super-Earth': 4,
  Neptune: 5,
  Jupiter: 6,
};

export const GAS_COMPOSITION_BY_SIZE: Readonly<
  Partial<Record<Planet['Size'], Planet['BulkComposition']>>
> = {
  Neptune: 'Neptunian Gas',
  Jupiter: 'Jovian Gas',
};

export const POPULATION_HAB_REQUIRED: Readonly<Record<InhabitedInfo['Population'], number>> = {
  'Fewer than 500': 0,
  'Fewer than a million inhabitants': 0,
  'Several million inhabitants': 2,
  'Hundreds of millions of inhabitants': 2,
  'Billions of inhabitants': 3,
};

export const TECH_HAB_REQUIRED: Readonly<Record<InhabitedInfo['TechLevel'], number>> = {
  'Neolithic-level technology': 3,
  'Medieval technology': 3,
  'Early Industrial Age tech': 3,
  'Tech like that of present-day Earth': 2,
  'Modern postech': 0,
  'Postech with specialties': 0,
  'Pretech with surviving infrastructure': 0,
};

export const TERRAN_BIOSPHERE_HAB_REQUIRED: Readonly<
  Record<InhabitedInfo['TerranBiosphere'], number>
> = {
  None: 0,
  Microbial: 1,
  Limited: 1,
  Significant: 2,
  Engineered: 1,
};

export const ATMOSPHERE_MAX_PERCENTILE: Readonly<Record<Planet['Atmosphere'], number>> = {
  Vacuum: 8,
  Corrosive: 11,
  Invasive: 17,
  'Corrosive+Invasive': 20,
  'Inert gas': 26,
  'Breathable: Thin/Thick': 34,
  Breathable: 100,
};

export const NATIVE_BIOSPHERE_MIN_PERCENTILE: Readonly<Record<Planet['NativeBiosphere'], number>> =
  {
    None: 1,
    Microbial: 20,
    Limited: 50,
    Significant: 60,
    Engineered: 95,
  };

export const POPULATION_RANGE: Readonly<
  Record<InhabitedInfo['Population'], readonly [number, number]>
> = {
  'Fewer than 500': [1, 9],
  'Fewer than a million inhabitants': [10, 31],
  'Several million inhabitants': [32, 75],
  'Hundreds of millions of inhabitants': [76, 94],
  'Billions of inhabitants': [95, 100],
};
