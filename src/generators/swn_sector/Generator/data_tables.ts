import type { AtmosphereCategory, InhabitedInfo, Planet } from '../BaseDTO/merged_schema';
import rawPlanetValues from '../Data/Raw/Details/planet_values.json';
import rawAttributeDetails from '../Data/Raw/Details/world_attributes.json';
import rawAttributeTables from '../Data/Raw/Tables/world_attributes.json';
import { ATMOSPHERE_DATA } from '../Shared/atmosphere_table';

const attributeTables = rawAttributeTables.tables as Array<{
  id: string;
  rows: Array<{ roll: string; result: string | number }>;
}>;
const attributeDetails = rawAttributeDetails.tables as Record<
  string,
  Record<string, Record<string, unknown>>
>;
function rows(id: string) {
  const table = attributeTables.find((candidate) => candidate.id === id);
  if (!table) throw new Error(`Missing table ${id}`);
  return table.rows;
}
function detail(id: string, value: string | number): Record<string, unknown> {
  return attributeDetails[id]?.[String(value)] ?? {};
}
function numberDetail(id: string, value: string | number, key: string): number {
  const result = detail(id, value)[key];
  if (typeof result !== 'number') throw new Error(`Missing ${key} detail for ${id}/${value}`);
  return result;
}
const planetValues = rawPlanetValues as {
  size: Record<string, { rank: number; gasComposition?: Planet['BulkComposition'] }>;
};
export const SIZE_RANK: Readonly<Record<Planet['Size'], number>> = Object.fromEntries(
  Object.entries(planetValues.size).map(([size, value]) => [size, value.rank]),
) as Record<Planet['Size'], number>;
export const GAS_COMPOSITION_BY_SIZE: Readonly<
  Partial<Record<Planet['Size'], Planet['BulkComposition']>>
> = Object.fromEntries(
  Object.entries(planetValues.size)
    .filter(([, value]) => value.gasComposition !== undefined)
    .map(([size, value]) => [size, value.gasComposition]),
) as Partial<Record<Planet['Size'], Planet['BulkComposition']>>;

export const POPULATION_HAB_REQUIRED: Readonly<Record<InhabitedInfo['Population'], number>> =
  Object.fromEntries(
    rows('population').map(({ result }) => [
      result,
      numberDetail('population', result, 'habRequired'),
    ]),
  ) as Record<InhabitedInfo['Population'], number>;
export const TECH_HAB_REQUIRED: Readonly<Record<InhabitedInfo['TechLevel'], number>> =
  Object.fromEntries(
    rows('tech_level').map(({ result }) => [
      result,
      numberDetail('tech_level', result, 'habRequired'),
    ]),
  ) as Record<InhabitedInfo['TechLevel'], number>;
export const TERRAN_BIOSPHERE_HAB_REQUIRED: Readonly<
  Record<InhabitedInfo['TerranBiosphere'], number>
> = Object.fromEntries(
  rows('terran_biosphere').map(({ result }) => [
    result,
    numberDetail('terran_biosphere', result, 'habRequired'),
  ]),
) as Record<InhabitedInfo['TerranBiosphere'], number>;
export const ATMOSPHERE_RANK: Readonly<Record<AtmosphereCategory, number>> = Object.fromEntries(
  ATMOSPHERE_DATA.rows.map(({ result }, index) => [result, index + 1]),
) as Record<AtmosphereCategory, number>;
