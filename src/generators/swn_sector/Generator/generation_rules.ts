import rawStarDetails from '../Data/Raw/Details/star_types.json';
import rawAttributeDetails from '../Data/Raw/Details/world_attributes.json';
import rawPoiDetails from '../Data/Raw/Details/points_of_interest.json';
import rawWorldTagDetails from '../Data/Raw/Details/world_tags.json';
import rawStarTable from '../Data/Raw/Tables/star_types.json';
import rawAtmosphereTable from '../Data/Raw/Tables/atmosphere.json';
import rawAttributeTables from '../Data/Raw/Tables/world_attributes.json';
import rawPoiDetailTables from '../Data/Raw/Tables/poi_detail_tables.json';
import rawPoiTable from '../Data/Raw/Tables/points_of_interest.json';
import rawWorldTagTable from '../Data/Raw/Tables/world_tags.json';
import type {
  InhabitedInfo,
  AtmosphereCategory,
  Planet,
  PointOfInterestType,
  StarType,
  Temperature,
  WorldTag,
} from '../BaseDTO/merged_schema';
import {
  directOrbitAuBand,
  directOrbitTemperatures,
  STAR_AU_WIDTHS,
} from '../Shared/spatial_interpretation';

type RawRow = { roll: string | number; result: string | number; weight?: number; hab?: number };
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
  adapt: (result: string | number, index: number) => T,
) {
  return rows.map((row, index) => {
    const [first, last] = rollSpan(row.roll);
    return {
      Value: adapt(row.result, index),
      Weight: row.weight ?? last - first + 1,
      ...(row.hab === undefined ? {} : { Hab: row.hab }),
    };
  });
}
const worldAttributeTables = rawAttributeTables.tables as Array<{
  id: string;
  rows: Array<{ roll: string; result: string | number }>;
}>;
const worldAttributeDetails = rawAttributeDetails.tables as Record<
  string,
  Record<string, Record<string, unknown>>
>;
function attributeTable(id: string): RawRow[] {
  const match = worldAttributeTables.find((candidate) => candidate.id === id);
  if (!match) throw new Error(`Missing reviewed table ${id}`);
  return match.rows.map((row) => ({
    ...row,
    ...(worldAttributeDetails[id]?.[String(row.result)] ?? {}),
  })) as RawRow[];
}
const starDetails = rawStarDetails.starTypes as Record<string, Record<string, unknown>>;
const starTable = (rawStarTable.tables as Array<{ id: string; rows: RawRow[] }>).find(
  (candidate) => candidate.id === 'star_type',
);
if (!starTable) throw new Error('Missing star_type table');
export const STAR_TABLE = adaptRows(
  starTable.rows.map((row) => ({ ...row, ...(starDetails[String(row.result)] ?? {}) })) as RawRow[],
  (result) => result as StarType,
);
export const ATMOSPHERE_TABLE = adaptRows(
  rawAtmosphereTable.class.rows,
  (result) => result as AtmosphereCategory,
);
export const TEMPERATURE_TABLE = adaptRows(
  attributeTable('temperature'),
  (result) => result as Temperature,
);
export const NATIVE_BIOSPHERE_TABLE = adaptRows(
  attributeTable('native_biosphere'),
  (result) => result as Planet['NativeBiosphere'],
);
export const TERRAN_BIOSPHERE_TABLE = adaptRows(
  attributeTable('terran_biosphere'),
  (result) => result as InhabitedInfo['TerranBiosphere'],
);
export const POPULATION_TABLE = adaptRows(
  attributeTable('population'),
  (result) => result as InhabitedInfo['Population'],
);
export const TECH_LEVEL_TABLE = adaptRows(
  attributeTable('tech_level'),
  (result) => Number(result) as InhabitedInfo['TechLevel'],
);
export const BULK_COMPOSITION_TABLE = adaptRows(
  attributeTable('bulk_composition'),
  (result) => result as Planet['BulkComposition'],
);
export const SIZE_TABLE = adaptRows(attributeTable('size'), (result) => result as Planet['Size']);
export const ALIEN_DEPENDENT_WORLD_TAGS = new Set(['Primitive Aliens', 'Xenophiles']);

export const WORLD_TAG_PROMPT_CATEGORIES = [
  'enemies',
  'friends',
  'complications',
  'things',
  'places',
] as const;
export type WorldTagPromptCategory = (typeof WORLD_TAG_PROMPT_CATEGORIES)[number];
export type WorldTagPromptLists = Record<WorldTagPromptCategory, readonly string[]>;
export interface WorldTagDefinition {
  roll: number;
  tag: string;
  prompts: WorldTagPromptLists;
}
const worldTagDetails = rawWorldTagDetails.tags as Record<
  string,
  { prompts?: WorldTagPromptLists }
>;
const worldTagRows = rawWorldTagTable.rows as Array<{ roll: number; result: string }>;
export const CANONICAL_WORLD_TAGS = worldTagRows.map((row) => row.result) as WorldTag[];
export const WORLD_TAG_DEFINITIONS: WorldTagDefinition[] = worldTagRows.map((row) => {
  const prompts = worldTagDetails[String(row.result)]?.prompts;
  if (!prompts) throw new Error(`Missing detail data for world tag ${row.result}`);
  for (const category of WORLD_TAG_PROMPT_CATEGORIES) {
    const values = prompts[category];
    if (!Array.isArray(values) || values.length === 0 || values.some((value) => !value))
      throw new Error(`World tag ${row.result} has an invalid ${category} prompt list`);
  }
  return { roll: row.roll, tag: row.result, prompts };
});
const tableWorldTags = new Set(CANONICAL_WORLD_TAGS);
if (Object.keys(worldTagDetails).some((tag) => !tableWorldTags.has(tag as WorldTag)))
  throw new Error('World-tag details contain values missing from the roll table');
export const WORLD_TAG_TABLE: WeightedCategory<WorldTag>[] = WORLD_TAG_DEFINITIONS.filter(
  (row) => !ALIEN_DEPENDENT_WORLD_TAGS.has(row.tag),
).map((row) => ({ Value: row.tag as WorldTag, Weight: 1 }));

export const POI_TABLE: WeightedCategory<PointOfInterestType>[] = adaptRows(
  rawPoiTable.rows as RawRow[],
  (result) => result as PointOfInterestType,
);
export interface PointOfInterestDetailEntry {
  roll: string;
  result: string;
}
export interface PointOfInterestDetailColumn {
  key: string;
  label: string;
  entries: PointOfInterestDetailEntry[];
}
const POI_DETAIL_COLUMN_LABELS: Record<string, string> = {
  occupants: 'Occupants',
  situations: 'Situation',
};
const poiDetailTables = rawPoiDetailTables.points as Record<
  string,
  Record<string, PointOfInterestDetailEntry[]>
>;
export const POI_DETAIL_COLUMNS_BY_TYPE: Partial<
  Record<PointOfInterestType, PointOfInterestDetailColumn[]>
> = Object.fromEntries(
  Object.entries(poiDetailTables).map(([point, columns]) => [
    point as PointOfInterestType,
    Object.entries(columns).map(([key, entries]) => ({
      key,
      label: POI_DETAIL_COLUMN_LABELS[key] ?? `${key[0]!.toUpperCase()}${key.slice(1)}`,
      entries,
    })),
  ]),
);
const extraWorldDetails = rawPoiDetails.extraWorlds.archetypes as Record<
  string,
  { category: string; description: string }
>;
export const EXTRA_WORLD_ARCHETYPES = Object.entries(extraWorldDetails).map(
  ([archetype, detail]) => ({
    ...detail,
    Archetype: archetype === 'KupierBelt' ? 'KuiperBelt' : archetype,
  }),
);

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
  assertD100Coverage(starTable!.rows, 'star_type');
  assertD100Coverage(rawAtmosphereTable.class.rows, 'atmosphere_class');
  for (const candidate of worldAttributeTables) assertD100Coverage(candidate.rows, candidate.id);
  assertD100Coverage(rawWorldTagTable.rows as RawRow[], 'world_tags');
  for (const star of Object.keys(STAR_AU_WIDTHS) as StarType[])
    for (const temperature of directOrbitTemperatures(star)) {
      const [minimum, maximum] = directOrbitAuBand(star, temperature);
      if (maximum <= minimum)
        throw new Error(`${star}/${temperature} has no direct-orbit AU interval`);
    }
}
