import type {
  HexLocation,
  Planet,
  OtherCelestialObjectType,
  PolityFlag,
  StarType,
  SystemObject,
  Temperature,
  WorldTag,
  IntelligenceText,
  ScanVisibility,
  SelectableObjectKind,
  StartingWorldMode,
} from '../BaseDTO/merged_schema';
import type { SectorCulture, SwnCulture } from '../BaseDTO/culture';
import type { StarPresentation } from '../Data/Projection/star_presentation';
import type { PlanetColor } from '../Data/Projection/planet_presentation';
import type { PortraitCategory, PortraitStyle } from '../Data/Projection/portrait_assets';
import type { ResolvedAtmosphere } from '../Shared/atmosphere_interpretation';

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

export type BasicScanContent = {
  entries: Array<
    { type: 'simple'; text: string } | { type: 'complex'; summary: string; lines: string[] }
  >;
};

export type PlanetDisplayDTO = {
  id: string;
  basicScan: BasicScanContent;
  atmosphere: ResolvedAtmosphere;
  displayedComposition: Planet['BulkComposition'] | 'Ice';
  color: PlanetColor;
  colorClass: string;
  starHabitability: number;
  habitabilityRating: number | null;
  habitabilityColor: string | null;
  tidallyLocked: boolean;
  populationRank: number | null;
  population: string | null;
  populationShort: string | null;
  technologyRating: number | null;
  technologyLevel: string | null;
  technologyLevelShort: string | null;
  technologyColorClass: string | null;
  stock: PlanetStockText;
};

export type StarDisplayDTO = {
  id: string;
  starType: StarType;
  basicScan: BasicScanContent;
  name: string;
  solarMass: number;
  solarLuminosity: number | null;
  description: string;
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

/** One detached, shared read model. Preview choices remain presentation behavior. */
export type DisplaySelectableDTO = {
  id: string;
  kind: SelectableObjectKind;
  kindLabel: string;
  containingSystemId: string | null;
  proceduralName: string;
  niceName: string;
  visibility: ScanVisibility;
  intelligence: IntelligenceText;
  portrait: PortraitDisplayDTO | null;
  portraitDescription: string;
  inspectorStock: PlanetStockText;
  inspectorBasicScan?: BasicScanContent;
  inspectorClaimants?: PolityDisplayDTO[];
  inhabited?: boolean;
  selectedCulture?: SectorCulture | null;
  size?: Planet['Size'];
  otherObjectType?: OtherCelestialObjectType;
  spatial?: ObjectSpatialDisplayDTO;
  planet?: PlanetDisplayDTO;
  star?: StarDisplayDTO;
  systemSpatial?: SystemSpatialDisplayDTO;
  claims?: PoliticalClaimsDisplayDTO;
  poi?: PoiDisplayDTO;
  habitablePoi?: HabitablePoiDisplayDTO;
  route?: RouteDisplayDTO;
  angleDegrees?: number;
};

export type DisplaySystemDTO = {
  id: string;
  starId: string;
  objectIds: string[];
  poiIds: string[];
  habitablePoiIds: string[];
  spatial: SystemSpatialDisplayDTO;
  star: StarDisplayDTO;
  claims: PoliticalClaimsDisplayDTO;
};

export type DisplaySectorDTO = {
  name: string;
  startingWorldId: string | null;
  playerShipId: string;
  playerShipLocationId: string;
  playerShipSystemId: string | null;
  systems: DisplaySystemDTO[];
  routeIds: string[];
  portalIds: string[];
  entities: Record<string, DisplaySelectableDTO>;
  polities: PolityDisplayDTO[];
  conquests: ConquestDisplayDTO[];
  culture: CultureScreenDisplayDTO;
};

export type ArchiveSectorDisplayDTO = {
  index: number;
  name: string;
  originalSeed: string;
  startingWorldMode: StartingWorldMode;
  startingWorldId: string | null;
  startingWorldName: string | null;
};
