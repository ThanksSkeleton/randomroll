import type { StarSystem, StarType, Temperature } from './merged_schema';

export const TEMPERATURE_RANK: Readonly<Record<Temperature, number>> = {
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

export const NORMAL_TEMPERATURES_HOT_TO_COLD: readonly Temperature[] = [
  'Scorching',
  'Infernal',
  'Equatorial',
  'Subtropical',
  'Mediterranean',
  'Temperate (warm)',
  'Temperate',
  'Temperate (chilly)',
  'Alpine',
  'Boreal',
  'Subarctic',
  'Polar',
  'Deepfrozen',
];
export function directOrbitAuBand(
  starType: StarType,
  temperature: Temperature,
): readonly [number, number] {
  const widths = STAR_AU_WIDTHS[starType];
  const hotEnd = widths.FromStar + widths.ExtremeHotRange;
  const normalEnd = hotEnd + widths.NormalRange;
  if (temperature === 'Furance') return [widths.FromStar, hotEnd];
  if (temperature === 'Cryogenic') return [normalEnd, normalEnd + widths.ExtremeColdRange];
  const index = NORMAL_TEMPERATURES_HOT_TO_COLD.indexOf(temperature);
  if (index < 0) throw new Error(`No AU band for temperature ${temperature}`);
  const width = widths.NormalRange / NORMAL_TEMPERATURES_HOT_TO_COLD.length;
  return [hotEnd + index * width, hotEnd + (index + 1) * width];
}
export function directOrbitTemperatures(starType: StarType): Temperature[] {
  return (Object.keys(TEMPERATURE_RANK) as Temperature[]).filter((temperature) => {
    const [minimum, maximum] = directOrbitAuBand(starType, temperature);
    return maximum > minimum;
  });
}

/** The continuous AU interval available to direct-orbit objects. */
export function directOrbitAuRange(starType: StarType): readonly [number, number] {
  const widths = STAR_AU_WIDTHS[starType];
  const minimum = widths.FromStar;
  const maximum = minimum + widths.ExtremeHotRange + widths.NormalRange + widths.ExtremeColdRange;
  return [minimum, maximum];
}

/** Resolves a direct-orbit AU into the detailed temperature band containing it. */
export function temperatureForDirectOrbitAu(starType: StarType, au: number): Temperature {
  const matches = directOrbitTemperatures(starType).filter((candidate) => {
    const [bandMinimum, bandMaximum] = directOrbitAuBand(starType, candidate);
    return au > bandMinimum && au < bandMaximum;
  });
  if (matches.length !== 1)
    throw new Error(
      `Expected one direct-orbit temperature band for ${starType} AU ${au}; found ${matches.length}`,
    );
  return matches[0]!;
}

/** Returns the AU boundaries enclosing all normal temperatures. */
export function normalTemperatureAuBand(starType: StarType): readonly [number, number] {
  const widths = STAR_AU_WIDTHS[starType];
  const inner = widths.FromStar + widths.ExtremeHotRange;
  return [inner, inner + widths.NormalRange];
}

/** The outer system boundary implied by System_AU_Width.csv. */
export function systemEdgeAu(starType: StarType): number {
  const widths = STAR_AU_WIDTHS[starType];
  return (
    widths.FromStar +
    widths.ExtremeHotRange +
    widths.NormalRange +
    widths.ExtremeColdRange +
    widths.ToSystemEdge
  );
}

export function effectiveOrbit(
  system: StarSystem,
  objectId: string,
): { au: number; temperature: Temperature } | undefined {
  const seen = new Set<string>();
  let id = objectId;
  for (;;) {
    if (seen.has(id)) return undefined;
    seen.add(id);
    const object = system.Objects.find((candidate) => candidate.Id === id);
    if (!object) return undefined;
    if (object.Orbit.ParentObjectId !== null) {
      const parent = system.Objects.find(
        (candidate) => candidate.Id === object.Orbit.ParentObjectId,
      );
      if (!parent || parent.Kind !== 'Planet' || parent.Orbit.ParentObjectId !== null)
        return undefined;
      id = object.Orbit.ParentObjectId;
      continue;
    }
    const au = object.Orbit.AU;
    if (!Number.isFinite(au)) return undefined;
    try {
      return { au, temperature: temperatureForDirectOrbitAu(system.Star.StarType, au) };
    } catch {
      return undefined;
    }
  }
}
