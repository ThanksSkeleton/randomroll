import type { StarSystem, StarType, Temperature } from '../BaseDTO/merged_schema';
import rawStarDetails from '../Data/Raw/Details/star_types.json';
import rawWorldAttributeDetails from '../Data/Raw/Details/world_attributes.json';

const temperatureDetails = rawWorldAttributeDetails.tables.temperature as Record<
  string,
  { orbitalOrder: number }
>;
const ORDERED_TEMPERATURES: readonly Temperature[] = Object.entries(temperatureDetails)
  .sort(([, first], [, second]) => first.orbitalOrder - second.orbitalOrder)
  .map(([temperature]) => temperature as Temperature);

export type StarAuWidths = {
  FromStar: number;
  ExtremeHotRange: number;
  ExtremeColdRange: number;
  NormalRange: number;
  ToSystemEdge: number;
};

const starTypeDetails = rawStarDetails.starTypes as unknown as Record<
  StarType,
  { auWidths?: StarAuWidths }
>;
export const STAR_AU_WIDTHS: Readonly<Record<StarType, StarAuWidths>> = Object.fromEntries(
  (Object.keys(starTypeDetails) as StarType[]).map((starType) => {
    const auWidths = starTypeDetails[starType].auWidths;
    if (auWidths === undefined) throw new Error(`Missing AU widths for star type ${starType}`);
    return [starType, auWidths];
  }),
) as Readonly<Record<StarType, StarAuWidths>>;

export const NORMAL_TEMPERATURES_HOT_TO_COLD: readonly Temperature[] = ORDERED_TEMPERATURES
  .slice(1, -1)
  .reverse();
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
  return ORDERED_TEMPERATURES.filter((temperature) => {
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
