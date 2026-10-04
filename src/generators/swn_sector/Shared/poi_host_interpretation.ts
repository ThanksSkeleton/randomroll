import type {
  OtherCelestialObjectType,
  Planet,
  PointOfInterestType,
  SystemObject,
} from '../BaseDTO/merged_schema';
import rawPoiDetails from '../Data/Raw/Details/points_of_interest.json';
import { GAS_COMPOSITION_BY_SIZE } from '../Generator/data_tables';

type PoiHostPredicate =
  | { kind: 'planet'; gasPlanet?: boolean }
  | { kind: 'otherCelestialObject'; objectType: OtherCelestialObjectType }
  | { kind: 'anyOf'; predicates: PoiHostPredicate[] };
type PoiDetails = {
  locationType: string;
  hostPredicate: PoiHostPredicate;
};

const poiDetails = rawPoiDetails.otherPoints as Partial<Record<PointOfInterestType, PoiDetails>>;
const GAS_COMPOSITIONS = new Set(Object.values(GAS_COMPOSITION_BY_SIZE));

export function isGasPlanet(planet: Planet): boolean {
  return GAS_COMPOSITIONS.has(planet.BulkComposition);
}

function matchesPredicate(predicate: PoiHostPredicate, parent: SystemObject): boolean {
  switch (predicate.kind) {
    case 'planet':
      return (
        parent.Kind === 'Planet' &&
        (predicate.gasPlanet === undefined || isGasPlanet(parent) === predicate.gasPlanet)
      );
    case 'otherCelestialObject':
      return parent.Kind === 'OtherCelestialObject' && parent.ObjectType === predicate.objectType;
    case 'anyOf':
      return predicate.predicates.some((candidate) => matchesPredicate(candidate, parent));
  }
}

export function isPoiHostCompatible(type: PointOfInterestType, parent: SystemObject): boolean {
  const predicate = poiDetails[type]?.hostPredicate;
  if (predicate === undefined) throw new Error(`Missing POI host predicate for ${type}`);
  return matchesPredicate(predicate, parent);
}
