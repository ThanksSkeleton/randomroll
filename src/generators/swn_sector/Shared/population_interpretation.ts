import type { Population } from '../BaseDTO/merged_schema';
import rawWorldAttributes from '../Data/Raw/Details/world_attributes.json';

export type PopulationStrings = { longString: string; shortString: string };

const populationDetails = rawWorldAttributes.tables.population as Record<string, PopulationStrings>;

export function populationStrings(population: Population): PopulationStrings {
  const details = populationDetails[String(population)];
  if (!details) throw new Error(`Missing population details for rank ${population}`);
  return details;
}
