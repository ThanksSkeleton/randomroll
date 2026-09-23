import type { InhabitedInfo, Planet, StarType } from './merged_schema';

export const TEMPERATURE_RANK: Readonly<Record<Planet['Temperature'], number>> = {
  Cryogenic: 1,
  Deepfrozen: 2,
  Polar: 3,
  Subarctic: 4,
  Boreal: 5,
  Alpine: 6,
  'Temperate (chilly)': 7,
  Temperate: 8,
  'Temperate (warm)': 9,
  Mediterranean: 10,
  Subtropical: 11,
  Equatorial: 12,
  Infernal: 13,
  Scorching: 14,
  Furance: 15,
};

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

export const TECH_LEVEL: Readonly<Record<InhabitedInfo['TechLevel'], number>> = {
  'Neolithic-level technology': 0,
  'Medieval technology': 1,
  'Early Industrial Age tech': 2,
  'Tech like that of present-day Earth': 3,
  'Modern postech': 4,
  'Postech with specialties': 4.1,
  'Pretech with surviving infrastructure': 5,
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

export type StarAuWidths = {
  FromStar: number;
  ExtremeHotRange: number;
  ExtremeColdRange: number;
  NormalRange: number;
  ToSystemEdge: number;
};

export const STAR_AU_WIDTHS: Readonly<Record<StarType, StarAuWidths>> = {
  'A-type': {
    FromStar: 0.273,
    ExtremeHotRange: 2.73,
    ExtremeColdRange: 8.19,
    NormalRange: 2.28,
    ToSystemEdge: 2.02,
  },
  'F-type': {
    FromStar: 0.111,
    ExtremeHotRange: 1.11,
    ExtremeColdRange: 3.34,
    NormalRange: 0.928,
    ToSystemEdge: 0.823,
  },
  'G-type': {
    FromStar: 0.086,
    ExtremeHotRange: 0.864,
    ExtremeColdRange: 2.59,
    NormalRange: 0.72,
    ToSystemEdge: 0.639,
  },
  'K-type': {
    FromStar: 0.036,
    ExtremeHotRange: 0.36,
    ExtremeColdRange: 1.08,
    NormalRange: 0.3,
    ToSystemEdge: 0.266,
  },
  'M-type': {
    FromStar: 0.0227,
    ExtremeHotRange: 0.227,
    ExtremeColdRange: 0.682,
    NormalRange: 0.189,
    ToSystemEdge: 0.168,
  },
  Giant: {
    FromStar: 0.535,
    ExtremeHotRange: 5.35,
    ExtremeColdRange: 16.06,
    NormalRange: 4.46,
    ToSystemEdge: 3.96,
  },
  'White dwarf': {
    FromStar: 0.303,
    ExtremeHotRange: 4.295,
    ExtremeColdRange: 10.355,
    NormalRange: 0,
    ToSystemEdge: 2.24,
  },
  'Neutron star': {
    FromStar: 0.303,
    ExtremeHotRange: 4.295,
    ExtremeColdRange: 10.355,
    NormalRange: 0,
    ToSystemEdge: 2.24,
  },
  'Stellar-mass black hole': {
    FromStar: 0.303,
    ExtremeHotRange: 4.295,
    ExtremeColdRange: 10.355,
    NormalRange: 0,
    ToSystemEdge: 2.24,
  },
};
