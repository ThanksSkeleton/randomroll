import rawStarTypes from '../../../swn_sector/star_types.json';
import rawWorldAttributes from '../../../swn_sector/world_attributes_2.json';
import rawWorldTagConstraints from '../../../swn_sector/world_tag_constraints.json';
import rawWorldTags from '../../../swn_sector/world_tags.json';
import rawPointsOfInterest from '../../../swn_sector/system_points_of_interest.json';
import type {
  InhabitedInfo,
  Planet,
  PointOfInterestType,
  StarType,
  SystemObject,
  WorldTag,
} from './merged_schema';
import { STAR_AU_WIDTHS, TEMPERATURE_RANK } from './tables';
export const NORMAL_TEMPERATURES_HOT_TO_COLD: readonly Planet['Temperature'][] = [
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
  temperature: Planet['Temperature'],
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
export function directOrbitTemperatures(starType: StarType): Planet['Temperature'][] {
  return (Object.keys(TEMPERATURE_RANK) as Planet['Temperature'][]).filter((temperature) => {
    const [minimum, maximum] = directOrbitAuBand(starType, temperature);
    return maximum > minimum;
  });
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

export type TagConstraint = {
  tag: string;
  maxEnvironmentalHab?: number;
  maxAtmospherePercentile?: number;
  minNativeBiospherePercentile?: number;
  minTechLevel?: number;
  minPopulationPercentile?: number;
  maxPopulationPercentile?: number;
};
export const WORLD_TAG_CONSTRAINTS = new Map(
  (rawWorldTagConstraints as { constraints: TagConstraint[] }).constraints.map((constraint) => [
    constraint.tag,
    constraint,
  ]),
);
export const POI_TYPES = new Set<PointOfInterestType>([
  'Deep-space station',
  'Asteroid base',
  'Remote moon base',
  'Ancient orbital ruin',
  'Research base',
  'Asteroid belt',
  'Comet base',
  'Comet belt',
  'Gas Mine',
  'Refueling station',
]);

export function isGasPlanet(planet: Planet): boolean {
  return planet.BulkComposition === 'Jovian Gas' || planet.BulkComposition === 'Neptunian Gas';
}
export function isPoiHostCompatible(type: PointOfInterestType, parent: SystemObject): boolean {
  switch (type) {
    case 'Deep-space station':
      return parent.Kind === 'OtherCelestialObject' && parent.ObjectType === 'IndependentStation';
    case 'Asteroid base':
    case 'Asteroid belt':
      return parent.Kind === 'OtherCelestialObject' && parent.ObjectType === 'AsteroidBelt';
    case 'Comet base':
    case 'Comet belt':
      return parent.Kind === 'OtherCelestialObject' && parent.ObjectType === 'KuiperBelt';
    case 'Remote moon base':
      return parent.Kind === 'Planet' && !isGasPlanet(parent);
    case 'Ancient orbital ruin':
    case 'Research base':
      return parent.Kind === 'Planet';
    case 'Gas Mine':
    case 'Refueling station':
      return (
        (parent.Kind === 'Planet' && isGasPlanet(parent)) ||
        (parent.Kind === 'OtherCelestialObject' && parent.ObjectType === 'GasCloud')
      );
  }
}

type RawRow = { roll: string | number; result?: string; weight?: number; hab?: number };
export type WeightedCategory<T> = { Value: T; Weight: number; Hab?: number };
function rollSpan(roll: string | number): readonly [number, number] {
  const [first, last = first] = String(roll).split('-').map(Number);
  if (
    !Number.isInteger(first) ||
    !Number.isInteger(last) ||
    first < 1 ||
    last > 100 ||
    first > last
  )
    throw new Error(`Invalid d100 roll span ${roll}`);
  return [first, last];
}
function adaptRows<T>(
  rows: readonly RawRow[],
  adapt: (result: string, index: number) => T,
): WeightedCategory<T>[] {
  return rows.map((row, index) => {
    if (row.result === undefined) throw new Error(`Missing result at row ${index}`);
    const [first, last] = rollSpan(row.roll);
    return {
      Value: adapt(row.result, index),
      Weight: row.weight ?? last - first + 1,
      ...(row.hab === undefined ? {} : { Hab: row.hab }),
    };
  });
}
function table(id: string): RawRow[] {
  const match = (
    rawWorldAttributes as { tables: Array<{ id: string; rows: RawRow[] }> }
  ).tables.find((candidate) => candidate.id === id);
  if (match === undefined) throw new Error(`Missing reviewed table ${id}`);
  return match.rows;
}
const TEMPERATURE_VARIANTS: readonly Planet['Temperature'][] = [
  'Temperate (chilly)',
  'Temperate',
  'Temperate (warm)',
];
export const STAR_TABLE = adaptRows(
  (rawStarTypes as { tables: Array<{ id: string; rows: RawRow[] }> }).tables.find(
    (candidate) => candidate.id === 'star_type',
  )?.rows ?? [],
  (result) => result as StarType,
);
export const ATMOSPHERE_TABLE = adaptRows(
  table('atmosphere'),
  (result) => result as Planet['Atmosphere'],
);
export const TEMPERATURE_TABLE = adaptRows(table('temperature'), (result, index) =>
  result === 'Temperate' ? TEMPERATURE_VARIANTS[index - 10]! : (result as Planet['Temperature']),
);
export const NATIVE_BIOSPHERE_TABLE = adaptRows(
  table('native_biosphere'),
  (result) => result as Planet['NativeBiosphere'],
);
export const TERRAN_BIOSPHERE_TABLE = adaptRows(
  table('terran_biosphere'),
  (result) => result as InhabitedInfo['TerranBiosphere'],
);
export const POPULATION_TABLE = adaptRows(
  table('population'),
  (result) => result as InhabitedInfo['Population'],
);
export const TECH_LEVEL_TABLE = adaptRows(
  table('tech_level'),
  (result) => result as InhabitedInfo['TechLevel'],
);
export const BULK_COMPOSITION_TABLE = adaptRows(
  table('bulk_composition'),
  (result) => result as Planet['BulkComposition'],
);
export const TERRESTRIAL_SIZE_TABLE = adaptRows(
  table('terrestrial_size'),
  (result) => result as Planet['Size'],
);
export const ALIEN_DEPENDENT_WORLD_TAGS = new Set(['Primitive Aliens', 'Xenophiles']);
/** Runtime reflection of the schema union; adapters are checked against it at startup. */
export const CANONICAL_WORLD_TAGS = [
  'Abandoned Colony',
  'Alien Ruins',
  'Altered Humanity',
  'Anarchists',
  'Anthropomorphs',
  'Area 51',
  'Badlands World',
  'Battleground',
  'Beastmasters',
  'Bubble Cities',
  'Cheap Life',
  'Civil War',
  'Cold War',
  'Colonized Population',
  'Cultural Power',
  'Cybercommunists',
  'Cyborgs',
  'Cyclical Doom',
  'Desert World',
  'Doomed World',
  'Dying Race',
  'Eugenic Cult',
  'Exchange Consulate',
  'Fallen Hegemon',
  'Feral World',
  'Flying Cities',
  'Forbidden Tech',
  'Former Warriors',
  'Freak Geology',
  'Freak Weather',
  'Friendly Foe',
  'Gold Rush',
  'Great Work',
  'Hatred',
  'Heavy Industry',
  'Heavy Mining',
  'Hivemind',
  'Holy War',
  'Hostile Biosphere',
  'Hostile Space',
  'Immortals',
  'Local Specialty',
  'Local Tech',
  'Major Spaceyard',
  'Mandarinate',
  'Mandate Base',
  'Maneaters',
  'Megacorps',
  'Mercenaries',
  'Minimal Contact',
  'Misandry/Misogyny',
  'Night World',
  'Nomads',
  'Oceanic World',
  'Out of Contact',
  'Outpost World',
  'Perimeter Agency',
  'Pilgrimage Site',
  'Pleasure World',
  'Police State',
  'Post-Scarcity',
  'Preceptor Archive',
  'Pretech Cultists',
  'Prison Planet',
  'Psionics Academy',
  'Psionics Fear',
  'Psionics Worship',
  'Quarantined World',
  'Radioactive World',
  'Refugees',
  'Regional Hegemon',
  'Restrictive Laws',
  'Revanchists',
  'Revolutionaries',
  'Rigid Culture',
  'Rising Hegemon',
  'Ritual Combat',
  'Robots',
  'Seagoing Cities',
  'Sealed Menace',
  'Secret Masters',
  'Sectarians',
  'Seismic Instability',
  'Shackled World',
  'Societal Despair',
  'Sole Supplier',
  'Taboo Treasure',
  'Terraform Failure',
  'Theocracy',
  'Tomb World',
  'Trade Hub',
  'Tyranny',
  'Unbraked AI',
  'Urbanized Surface',
  'Utopia',
  'Warlords',
  'Xenophobes',
  'Zombies',
] as const satisfies readonly WorldTag[];
const CANONICAL_WORLD_TAG_SET = new Set<string>(CANONICAL_WORLD_TAGS);
export const WORLD_TAG_TABLE: WeightedCategory<WorldTag>[] = (
  rawWorldTags as { tags: Array<{ roll: number; tag: string }> }
).tags
  .filter((row) => !ALIEN_DEPENDENT_WORLD_TAGS.has(row.tag))
  .map((row) => {
    if (!CANONICAL_WORLD_TAG_SET.has(row.tag))
      throw new Error(`Unknown canonical world tag ${row.tag}`);
    return { Value: row.tag as WorldTag, Weight: 1 };
  });
export const POI_TABLE: WeightedCategory<PointOfInterestType>[] = (
  rawPointsOfInterest as { otherPoint: { rows: Array<{ point: string }> } }
).otherPoint.rows.map((row) => ({ Value: row.point as PointOfInterestType, Weight: 1 }));
export const EXTRA_WORLD_ARCHETYPES = (
  rawPointsOfInterest as {
    extraWorlds: { archetypes: Array<{ archetype: string; category: string }> };
  }
).extraWorlds.archetypes.map((row) => ({
  ...row,
  Archetype: row.archetype === 'KupierBelt' ? 'KuiperBelt' : row.archetype,
}));

export function assertD100Coverage(rows: readonly RawRow[], tableName: string): void {
  const coverage = new Set<number>();
  for (const row of rows) {
    const [first, last] = rollSpan(row.roll);
    for (let roll = first; roll <= last; roll += 1) {
      if (coverage.has(roll)) throw new Error(`${tableName} overlaps at ${roll}`);
      coverage.add(roll);
    }
  }
  if (coverage.size !== 100) throw new Error(`${tableName} does not cover 1-100 exactly once`);
}
export function assertReviewedTableIntegrity(): void {
  assertD100Coverage(
    (rawStarTypes as { tables: Array<{ rows: RawRow[] }> }).tables[0]!.rows,
    'star_type',
  );
  for (const candidate of (rawWorldAttributes as { tables: Array<{ id: string; rows: RawRow[] }> })
    .tables)
    assertD100Coverage(candidate.rows, candidate.id);
  for (const star of Object.keys(STAR_AU_WIDTHS) as StarType[])
    for (const temperature of directOrbitTemperatures(star)) {
      const [minimum, maximum] = directOrbitAuBand(star, temperature);
      if (maximum <= minimum)
        throw new Error(`${star}/${temperature} has no direct-orbit AU interval`);
    }
}
