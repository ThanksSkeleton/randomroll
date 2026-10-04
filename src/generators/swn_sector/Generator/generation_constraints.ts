import rawWorldTagDetails from '../Data/Raw/Details/world_tags.json';
import rawPoiTable from '../Data/Raw/Tables/points_of_interest.json';
import type { PointOfInterestType } from '../BaseDTO/merged_schema';

export type TagConstraint = {
  tag: string;
  maxEnvironmentalHab?: number;
  maxAtmosphereRank?: number;
  minNativeBiosphereRank?: number;
  minTechLevel?: number;
  minPopulationRank?: number;
  maxPopulationRank?: number;
};
const tagDetails = rawWorldTagDetails.tags as Record<
  string,
  { constraints?: Omit<TagConstraint, 'tag'> }
>;
export const DEFAULT_HAS_ALIENS = false;
export const WORLD_TAG_CONSTRAINTS = new Map(
  Object.entries(tagDetails).flatMap(([tag, detail]) =>
    detail.constraints ? [[tag, { tag, ...detail.constraints } as TagConstraint]] : [],
  ),
);
export const POI_TYPES = new Set<PointOfInterestType>(
  (rawPoiTable.rows as Array<{ result: string }>).map((row) => row.result as PointOfInterestType),
);
