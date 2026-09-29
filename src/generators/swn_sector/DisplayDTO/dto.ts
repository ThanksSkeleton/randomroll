import type {
  HexLocation,
  Planet,
  StarType,
  SystemObject,
  Temperature,
} from '../BaseDTO/merged_schema';
import type { StarPresentation } from '../Data/Projection/star_presentation';
import type { PlanetColor } from '../Data/Projection/planet_presentation';
import type { PortraitCategory, PortraitStyle } from '../Data/Projection/portrait_assets';

export type PortraitDisplayDTO = {
  portraitIndex: number;
  variantId: string;
  category: PortraitCategory;
  url: string;
  style: PortraitStyle;
};

export type PlanetStockText = {
  basic: string;
  detailed: string;
  politics: string;
  deep: string;
  gm: string;
};

export type PlanetDisplayDTO = {
  id: string;
  displayedComposition: Planet['BulkComposition'] | 'Ice';
  color: PlanetColor;
  colorClass: string;
  starHabitability: number;
  habitabilityRating: number | null;
  habitabilityColor: string | null;
  tidallyLocked: boolean;
  populationTier: number | null;
  population: string | null;
  technologyRating: number | null;
  technologyLevel: string | null;
  technologyColorClass: string | null;
  stock: PlanetStockText;
};

export type StarDisplayDTO = {
  id: string;
  starType: StarType;
  color: StarPresentation['color'];
  size: number;
  recipe: StarPresentation['recipe'];
  className: string;
  styleTokens: Record<string, string>;
};

export type ObjectSpatialDisplayDTO = {
  id: string;
  kind: SystemObject['Kind'];
  parentId: string | null;
  angleDegrees: number;
  effectiveAu: number;
  temperature: Temperature;
  kindLabel: string;
  typeLabel: string | null;
  glyphClass: string | null;
  inspectorBasic: string | null;
};

export type SystemSpatialDisplayDTO = {
  systemId: string;
  starType: StarType;
  hexLocation: { Column: number; Row: number };
  inspectorBasic: string;
  systemEdgeAu: number;
  directOrbitAuRange: readonly [number, number];
  normalTemperatureAuBand: readonly [number, number];
  normalTemperatureBandEmpty: boolean;
  temperatureBands: ReadonlyArray<{
    temperature: Temperature;
    au: readonly [number, number];
  }>;
};

export type RouteDisplayDTO = {
  id: string;
  portalIds: readonly [string, string];
  endpointSystemIds: readonly [string, string];
  endpointHexes: readonly [HexLocation, HexLocation];
  hexDistance: number;
  inspectorBasic: string;
  endpointNames: readonly [string, string];
  symbolicDestinations: readonly [string, string];
  topDownDestinations: readonly [string, string];
};
