/** The UI consumes the generator's canonical sector contract directly. */
export type {
  Atmosphere,
  BulkComposition,
  Guid,
  HexLocation,
  InhabitedInfo,
  IntelligenceText,
  NativeBiosphere,
  OtherCelestialObject,
  Planet,
  PlayerShip,
  PointOfInterest,
  Route,
  RoutePortal,
  Sector,
  SelectableEntity,
  Size,
  Star,
  StarSystem,
  SystemObject,
  Temperature,
} from '../../../merged_schema';

export const VisibilityLevel = {
  NONE: 'NONE',
  BASIC_SCAN: 'BASIC_SCAN',
  CULTURE_PARTIAL: 'CULTURE_PARTIAL',
  CULTURE_FULL: 'CULTURE_FULL',
} as const;
export type VisibilityLevel = (typeof VisibilityLevel)[keyof typeof VisibilityLevel];
export function visibilityRank(level: VisibilityLevel): number {
  return level === VisibilityLevel.NONE
    ? 0
    : level === VisibilityLevel.BASIC_SCAN
      ? 1
      : level === VisibilityLevel.CULTURE_PARTIAL
        ? 2
        : 3;
}

import type {
  OtherCelestialObject,
  Planet,
  PlayerShip,
  PointOfInterest,
  Route,
  RoutePortal,
  Sector,
  Star,
  StarSystem,
} from '../../../merged_schema';

export type SelectableObject =
  | StarSystem
  | Star
  | Planet
  | OtherCelestialObject
  | PointOfInterest
  | RoutePortal
  | Route
  | PlayerShip;

export type SelectableObjectKind =
  | 'System'
  | 'Star'
  | 'Planet'
  | 'OtherCelestialObject'
  | 'PointOfInterest'
  | 'RoutePortal'
  | 'Route'
  | 'PlayerShip';

export interface FoundObject {
  object: SelectableObject;
  kind: SelectableObjectKind;
  containingSystem?: StarSystem;
}

export type CanonicalSector = Sector;
