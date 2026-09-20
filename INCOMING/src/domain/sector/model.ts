export type Guid = string;

export const VisibilityLevel = {
  NONE: "NONE",
  BASIC_SCAN: "BASIC_SCAN",
  CULTURE_PARTIAL: "CULTURE_PARTIAL",
  CULTURE_FULL: "CULTURE_FULL",
} as const;

export type VisibilityLevel = typeof VisibilityLevel[keyof typeof VisibilityLevel];

export function visibilityRank(level: VisibilityLevel): number {
  return level === VisibilityLevel.NONE ? 0 : level === VisibilityLevel.BASIC_SCAN ? 1 : level === VisibilityLevel.CULTURE_PARTIAL ? 2 : 3;
}

export interface HexLocation { X: number; Y: number; }
export interface Star { Id: Guid; StarType: string; }
export interface World { Id: Guid; WorldType: string; inhabitedWorld: boolean; Angle: number; MoonOf: Guid | null; AU: number | null; }
export interface POI { Id: Guid; POIType: string; ParentObjectId: Guid; }

/** A system in the sector. StarSystem is the application-facing name for the schema's System. */
export interface StarSystem { Id: Guid; HexLocation: HexLocation; Star: Star; Worlds: World[]; POIs: POI[]; }
export type System = StarSystem;
export interface Route { Id: Guid; SystemId1: Guid; SystemId2: Guid; }
export interface PlayerShip { Id: Guid; CurrentSystemId: Guid; CurrentLocationId: Guid; }

export interface SurveySummary { Text: string; }
export interface BasicScanDetails { Text: string; }
export interface PartialCultureDetails { Text: string; }
export interface FullCultureDetails { Text: string; }
export interface GmDetails { Text: string; }

export interface DetailsAndVisibility {
  Id: Guid;
  ProceduralName: string;
  NiceName: string;
  VisibilityLevel: VisibilityLevel;
  InfoboxSummary: SurveySummary;
  Details_Basic_Scan: BasicScanDetails;
  Details_Culture_Partial: PartialCultureDetails;
  Details_Culture_Full: FullCultureDetails;
  Details_GM: GmDetails;
}

export interface Sector {
  OriginalSeed: string;
  SectorName: string;
  Systems: StarSystem[];
  Routes: Route[];
  PlayerShip: PlayerShip;
  DetailsAndVisibility: DetailsAndVisibility[];
}

export type SelectableObject = StarSystem | Star | World | POI | Route | PlayerShip;
export type SelectableObjectKind = "System" | "Star" | "World" | "POI" | "Route" | "PlayerShip";
export interface FoundObject { object: SelectableObject; kind: SelectableObjectKind; containingSystem?: StarSystem; }
