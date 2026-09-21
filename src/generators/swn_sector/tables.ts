import type { InhabitedInfo, Planet, StarType } from "./merged_schema";

export const TEMPERATURE_RANK: Readonly<Record<Planet["Temperature"], number>> = {
  Cryogenic: 1,
  Glacial: 2,
  Polar: 3,
  Subarctic: 4,
  Boreal: 5,
  Alpine: 6,
  "Temperate (chilly)": 7,
  Temperate: 8,
  "Temperate (warm)": 9,
  Mediterranean: 10,
  Subtropical: 11,
  Equatorial: 12,
  Arid: 13,
  Infernal: 14,
  Volcanic: 15,
};

export const SIZE_RANK: Readonly<Record<Planet["Size"], number>> = {
  Luna: 1,
  Mars: 2,
  Earth: 3,
  "Super-Earth": 4,
  Neptune: 5,
  Jupiter: 6,
};

export const GAS_COMPOSITION_BY_SIZE: Readonly<Partial<Record<Planet["Size"], Planet["BulkComposition"]>>> = {
  Neptune: "Neptunian Gas",
  Jupiter: "Jovian Gas",
};

export const POPULATION_HAB_REQUIRED: Readonly<Record<InhabitedInfo["Population"], number>> = {
  "Fewer than 500": 0,
  "Fewer than a million inhabitants": 0,
  "Several million inhabitants": 2,
  "Hundreds of millions of inhabitants": 2,
  "Billions of inhabitants": 3,
};

export const TECH_HAB_REQUIRED: Readonly<Record<InhabitedInfo["TechLevel"], number>> = {
  "Neolithic-level technology": 3,
  "Medieval technology": 3,
  "Early Industrial Age tech": 3,
  "Tech like that of present-day Earth": 2,
  "Modern postech": 0,
  "Postech with specialties": 0,
  "Pretech with surviving infrastructure": 0,
};

export const TECH_LEVEL: Readonly<Record<InhabitedInfo["TechLevel"], number>> = {
  "Neolithic-level technology": 0,
  "Medieval technology": 1,
  "Early Industrial Age tech": 2,
  "Tech like that of present-day Earth": 3,
  "Modern postech": 4,
  "Postech with specialties": 4.1,
  "Pretech with surviving infrastructure": 5,
};

export const TERRAN_BIOSPHERE_HAB_REQUIRED: Readonly<Record<InhabitedInfo["TerranBiosphere"], number>> = {
  None: 0,
  Microbial: 1,
  Limited: 1,
  Significant: 2,
  Engineered: 1,
};

export const ATMOSPHERE_MAX_PERCENTILE: Readonly<Record<Planet["Atmosphere"], number>> = {
  Vacuum: 8,
  Corrosive: 11,
  Invasive: 17,
  "Corrosive+Invasive": 20,
  "Inert gas": 26,
  "Breathable: Thin/Thick": 34,
  Breathable: 100,
};

export const NATIVE_BIOSPHERE_MIN_PERCENTILE: Readonly<Record<Planet["NativeBiosphere"], number>> = {
  None: 1,
  Microbial: 20,
  Limited: 50,
  Significant: 60,
  Engineered: 95,
};

export const POPULATION_RANGE: Readonly<Record<InhabitedInfo["Population"], readonly [number, number]>> = {
  "Fewer than 500": [1, 9],
  "Fewer than a million inhabitants": [10, 31],
  "Several million inhabitants": [32, 75],
  "Hundreds of millions of inhabitants": [76, 94],
  "Billions of inhabitants": [95, 100],
};

export const ATMOSPHERE_HAB: Readonly<Record<Planet["Atmosphere"], number>> = {
  Vacuum: 0,
  Corrosive: 0,
  Invasive: 0,
  "Corrosive+Invasive": 0,
  "Inert gas": 0,
  "Breathable: Thin/Thick": 2,
  Breathable: 3,
};

export const TEMPERATURE_HAB: Readonly<Record<Planet["Temperature"], number>> = {
  Cryogenic: 0,
  Glacial: 1,
  Polar: 1,
  Subarctic: 2,
  Boreal: 3,
  Alpine: 3,
  "Temperate (chilly)": 3,
  Temperate: 3,
  "Temperate (warm)": 3,
  Mediterranean: 3,
  Subtropical: 3,
  Equatorial: 2,
  Arid: 1,
  Infernal: 1,
  Volcanic: 0,
};

export const TERRAN_BIOSPHERE_HAB: Readonly<Record<InhabitedInfo["TerranBiosphere"], number>> = {
  None: 0,
  Microbial: 1,
  Limited: 2,
  Significant: 3,
  Engineered: 3,
};

export const SIZE_HAB: Readonly<Record<Planet["Size"], number>> = {
  Luna: 1,
  Mars: 2,
  Earth: 3,
  "Super-Earth": 2,
  Neptune: 0,
  Jupiter: 0,
};

export const BULK_COMPOSITION_HAB: Readonly<Record<Planet["BulkComposition"], number>> = {
  Sulfur: 1,
  Carbon: 1,
  Magnesium: 1,
  "Calcium-Aluminum": 1,
  Iron: 1,
  Water: 2,
  Silicon: 3,
  "Jovian Gas": 0,
  "Neptunian Gas": 0,
};

export type StarAuWidths = {
  FromStar: number;
  ExtremeHotRange: number;
  ExtremeColdRange: number;
  NormalRange: number;
  ToSystemEdge: number;
};

export const STAR_AU_WIDTHS: Readonly<Record<StarType, StarAuWidths>> = {
  "A-type": {
    FromStar: .08,
    ExtremeHotRange: 5,
    ExtremeColdRange: 15,
    NormalRange: 3.6,
    ToSystemEdge: 4.736,
  },
  "F-type": {
    FromStar: .04,
    ExtremeHotRange: 1.2,
    ExtremeColdRange: 3.6,
    NormalRange: 2.3,
    ToSystemEdge: .948,
  },
  "G-type": {
    FromStar: .02,
    ExtremeHotRange: .8,
    ExtremeColdRange: 2.4,
    NormalRange: 1.2,
    ToSystemEdge: .564,
  },
  "K-type": {
    FromStar: .01,
    ExtremeHotRange: .3,
    ExtremeColdRange: .9,
    NormalRange: 1,
    ToSystemEdge: .322,
  },
  "M-type": {
    FromStar: .002,
    ExtremeHotRange: .02,
    ExtremeColdRange: .06,
    NormalRange: .58,
    ToSystemEdge: .1244,
  },
  Giant: {
    FromStar: .15,
    ExtremeHotRange: 6.1,
    ExtremeColdRange: 18.3,
    NormalRange: 4.4,
    ToSystemEdge: 3.35,
  },
  "White dwarf": {
    FromStar: .5,
    ExtremeHotRange: 1.5,
    ExtremeColdRange: 4.5,
    NormalRange: 0,
    ToSystemEdge: .7,
  },
  "Neutron star": {
    FromStar: .5,
    ExtremeHotRange: 1.5,
    ExtremeColdRange: 4.5,
    NormalRange: 0,
    ToSystemEdge: .7,
  },
  "Stellar-mass black hole": {
    FromStar: .5,
    ExtremeHotRange: 1.5,
    ExtremeColdRange: 4.5,
    NormalRange: 0,
    ToSystemEdge: .7,
  },
};
