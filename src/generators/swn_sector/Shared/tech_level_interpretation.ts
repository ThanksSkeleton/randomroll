import type { TechLevel } from '../BaseDTO/merged_schema';
import rawWorldAttributes from '../Data/Raw/Details/world_attributes.json';

export type TechLevelStrings = { longString: string; shortString: string };

const techLevelDetails = rawWorldAttributes.tables.tech_level as Record<string, TechLevelStrings>;

export function techLevelStrings(techLevel: TechLevel): TechLevelStrings {
  const details = techLevelDetails[String(techLevel)];
  if (!details) throw new Error(`Missing tech level details for ${techLevel}`);
  return details;
}
