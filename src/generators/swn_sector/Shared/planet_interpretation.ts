import rawStarDetails from '../Data/Raw/Details/star_types.json';
import rawAttributeDetails from '../Data/Raw/Details/world_attributes.json';
import rawStarTable from '../Data/Raw/Tables/star_types.json';
import rawAttributeTables from '../Data/Raw/Tables/world_attributes.json';
import type { InhabitedInfo, Planet, StarType, Temperature } from '../BaseDTO/merged_schema';
import { resolveAtmosphere } from './atmosphere_interpretation';

/** Deterministic interpretations of canonical planet and star facts. */
function ratingsFromDetails<T extends string | number>(
  label: string,
  canonicalValues: readonly T[],
  details: Record<string, Record<string, unknown>>,
): Readonly<Record<T, number>> {
  const ratings = {} as Record<T, number>;
  for (const value of canonicalValues) {
    const rating = details[String(value)]?.hab;
    if (typeof rating !== 'number' || !Number.isFinite(rating)) {
      throw new Error(`Missing numeric habitability rating for ${label} "${value}"`);
    }
    ratings[value] = rating;
  }
  return Object.freeze(ratings);
}

const starTable = rawStarTable.tables.find((table) => table.id === 'star_type');
if (!starTable) throw new Error('Missing star_type table for habitability ratings');
const attributeTable = (id: string) => {
  const table = rawAttributeTables.tables.find((candidate) => candidate.id === id);
  if (!table) throw new Error(`Missing ${id} table for habitability ratings`);
  return table.rows.map((row) => String(row.result));
};

export const STAR_HABITABILITY: Readonly<Record<StarType, number>> = ratingsFromDetails(
  'star type',
  starTable.rows.map((row) => String(row.result) as StarType),
  rawStarDetails.starTypes,
);

const attributes = rawAttributeDetails.tables;
export const TEMPERATURE_HAB: Readonly<Record<Temperature, number>> = ratingsFromDetails(
  'temperature',
  attributeTable('temperature') as Temperature[],
  attributes.temperature,
);
export const TERRAN_BIOSPHERE_HAB: Readonly<
  Record<InhabitedInfo['TerranBiosphere'], number>
> = ratingsFromDetails(
  'terran biosphere',
  attributeTable('terran_biosphere').map(Number) as InhabitedInfo['TerranBiosphere'][],
  attributes.terran_biosphere,
);
export const SIZE_HAB: Readonly<Record<Planet['Size'], number>> = ratingsFromDetails(
  'size',
  attributeTable('size') as Planet['Size'][],
  attributes.size,
);
export const BULK_COMPOSITION_HAB: Readonly<Record<Planet['BulkComposition'], number>> =
  ratingsFromDetails(
    'bulk composition',
    [
      ...attributeTable('bulk_composition'),
      'Jovian Gas',
      'Neptunian Gas',
    ] as Planet['BulkComposition'][],
    attributes.bulk_composition,
  );

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
