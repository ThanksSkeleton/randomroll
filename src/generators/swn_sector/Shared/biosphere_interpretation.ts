import type { NativeBiosphere } from '../BaseDTO/merged_schema';
import rawWorldAttributes from '../Data/Raw/Details/world_attributes.json';

const biosphereNames = rawWorldAttributes.tables.terran_biosphere as Record<
  string,
  { name: string }
>;

export function biosphereName(rank: NativeBiosphere): string {
  const details = biosphereNames[String(rank)];
  if (!details?.name) throw new Error(`Missing biosphere name for rank ${rank}`);
  return details.name;
}
