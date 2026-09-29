import type { PointOfInterestType } from '../../BaseDTO/merged_schema';
import rawWorldTagConstraints from './world_tag_constraints.json';

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
