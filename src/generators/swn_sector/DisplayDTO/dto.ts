import type {
  HexLocation,
  Planet,
  PolityFlag,
  StarType,
  SystemObject,
  Temperature,
  WorldTag,
} from '../BaseDTO/merged_schema';
import type { SwnCulture } from '../BaseDTO/culture';
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

export type PolityDisplayDTO = {
  id: string;
  homeworldId: string;
  NiceName: string;
  Flag: PolityFlag;
  attack: number;
  defense: number;
  projection: number;
};

export type PoliticalClaimsDisplayDTO = {
  id: string;
  claimantIds: string[];
  claimants: PolityDisplayDTO[];
  count: number;
  stockText: string;
};

export type ConquestDisplayDTO = {
  id: string;
  attacker: PolityDisplayDTO;
  defender: PolityDisplayDTO;
  targetWorldId: string;
  targetName: string;
  routeDistance: number;
  attack: number;
  defense: number;
  outcome: 'CONQUEST' | 'DEFENSE';
  explanation: string;
};

export type WorldTagDisplayDTO = { tag: WorldTag; description: string };
export type PoiDisplayDTO = {
  id: string;
  hostId: string;
  typeLabel: string;
  inspectorBasic: string;
};
export type HabitablePoiDisplayDTO = {
  id: string;
  typeLabel: string;
  marker: string;
  hostId: string;
  assignedPolity: PolityDisplayDTO | null;
  absent: boolean;
  reason: string | null;
  fields: [string, string][];
  polityIds: string[];
  stock: PlanetStockText;
};
export type CultureWorldDisplayDTO = {
  id: string;
  name: string;
  systemName: string;
  kindLabel: 'Moon' | 'Planet';
  complete: boolean;
  startingWorld: boolean;
  techLevel: string;
  population: string;
  tags: [WorldTagDisplayDTO, WorldTagDisplayDTO];
  originalPolity: PolityDisplayDTO | null;
  claims: PoliticalClaimsDisplayDTO;
  culture: SwnCulture | null;
  hpois: HabitablePoiDisplayDTO[];
};
export type CultureOverviewRowDisplayDTO = {
  worldId: string;
  worldName: string;
  startingWorld: boolean;
  complete: boolean;
  originalPolity: PolityDisplayDTO | null;
  currentPolities: PolityDisplayDTO[];
};
export type CultureScreenDisplayDTO = {
  worlds: CultureWorldDisplayDTO[];
  overview: CultureOverviewRowDisplayDTO[];
};
