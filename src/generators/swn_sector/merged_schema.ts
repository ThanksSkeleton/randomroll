/**
 * Canonical merged SWN sector schema.
 *
 * This is the Phase 1 design contract from SCHEMA_COMPARISON.html. It is
 * deliberately independent of the current V4 generator representation:
 * generation rolls, slot wrappers, orbital-zone categories, and ingress /
 * egress regions are implementation details and are not part of this model.
 */

export type Guid = string;

export type VisibilityLevel = 'NONE' | 'BASIC_SCAN' | 'CULTURE_PARTIAL' | 'CULTURE_FULL';

export interface IntelligenceText {
  InfoboxSummary: string;
  BasicScan: string;
  CulturePartial: string;
  CultureFull: string;
  GM: string;
}

/** Shared identity, naming, disclosure, and selection state. */
export interface SelectableEntity {
  Id: Guid;
  ProceduralName: string;
  NiceName: string;
  VisibilityLevel: VisibilityLevel;
  Intelligence: IntelligenceText;
}

export interface Sector {
  SchemaVersion: 'merged-v1';
  /** Generation provenance; it is not a complete replay specification. */
  OriginalSeed: string;
  SectorName: string;
  Systems: StarSystem[];
  Routes: Route[];
  RoutePortals: RoutePortal[];
  PlayerShip: PlayerShip;
}

export interface Route extends SelectableEntity {
  PortalIds: [Guid, Guid];
}

/** One end of a route, located on its system's derived boundary. */
export interface RoutePortal extends SelectableEntity {
  RouteId: Guid;
  SystemId: Guid;
  /** Inclusive at 0; exclusive at 360. */
  BoundaryAngleDegrees: number;
}

export interface PlayerShip extends SelectableEntity {
  /** A system-contained location, route portal, or route; never this ship. */
  CurrentLocationId: Guid;
}

export interface HexLocation {
  /** Intended sector grid bounds: integer 1 through 11. */
  Column: number;
  /** Intended sector grid bounds: integer 1 through 7. */
  Row: number;
}

export interface StarSystem extends SelectableEntity {
  HexLocation: HexLocation;
  Star: Star;
  Objects: SystemObject[];
  PointsOfInterest: PointOfInterest[];
}

export type StarType =
  | 'A-type'
  | 'F-type'
  | 'G-type'
  | 'K-type'
  | 'M-type'
  | 'Giant'
  | 'White dwarf'
  | 'Neutron star'
  | 'Stellar-mass black hole';

export interface Star extends SelectableEntity {
  StarType: StarType;
  HabitabilityRating: number;
}

export interface Orbit {
  /**
   * Generated star-relative distance. For direct orbits, a randomized
   * temperature- and star-constrained placement roll selects this value.
   * A moon inherits its parent planet's value; no separate moon-to-planet
   * distance is modeled.
   */
  AU: number;
  /** Inclusive at 0; exclusive at 360. */
  AngleDegrees: number;
  /** Null means a direct orbit of the system's star. */
  ParentObjectId: Guid | null;
}

export interface SystemObjectBase extends SelectableEntity {
  Orbit: Orbit;
  /** Authoritative thermal value used to constrain generated star-relative AU. */
  Temperature: Temperature;
  Kind: 'Planet' | 'OtherCelestialObject';
}

export type OtherCelestialObjectType =
  'AsteroidBelt' | 'KuiperBelt' | 'GasCloud' | 'IndependentStation';

export interface OtherCelestialObject extends SystemObjectBase {
  Kind: 'OtherCelestialObject';
  ObjectType: OtherCelestialObjectType;
}

export type SystemObject = Planet | OtherCelestialObject;

export interface Planet extends SystemObjectBase {
  Kind: 'Planet';
  Size: Size;
  BulkComposition: BulkComposition;
  SurfaceWaterPresent: boolean;
  TidallyLocked: boolean;
  Atmosphere: Atmosphere;
  NativeBiosphere: NativeBiosphere;
  InhabitedInfo: InhabitedInfo | false;
}

export type WorldTag =
  | 'Abandoned Colony'
  | 'Alien Ruins'
  | 'Altered Humanity'
  | 'Anarchists'
  | 'Anthropomorphs'
  | 'Area 51'
  | 'Badlands World'
  | 'Battleground'
  | 'Beastmasters'
  | 'Bubble Cities'
  | 'Cheap Life'
  | 'Civil War'
  | 'Cold War'
  | 'Colonized Population'
  | 'Cultural Power'
  | 'Cybercommunists'
  | 'Cyborgs'
  | 'Cyclical Doom'
  | 'Desert World'
  | 'Doomed World'
  | 'Dying Race'
  | 'Eugenic Cult'
  | 'Exchange Consulate'
  | 'Fallen Hegemon'
  | 'Feral World'
  | 'Flying Cities'
  | 'Forbidden Tech'
  | 'Former Warriors'
  | 'Freak Geology'
  | 'Freak Weather'
  | 'Friendly Foe'
  | 'Gold Rush'
  | 'Great Work'
  | 'Hatred'
  | 'Heavy Industry'
  | 'Heavy Mining'
  | 'Hivemind'
  | 'Holy War'
  | 'Hostile Biosphere'
  | 'Hostile Space'
  | 'Immortals'
  | 'Local Specialty'
  | 'Local Tech'
  | 'Major Spaceyard'
  | 'Mandarinate'
  | 'Mandate Base'
  | 'Maneaters'
  | 'Megacorps'
  | 'Mercenaries'
  | 'Minimal Contact'
  | 'Misandry/Misogyny'
  | 'Night World'
  | 'Nomads'
  | 'Oceanic World'
  | 'Out of Contact'
  | 'Outpost World'
  | 'Perimeter Agency'
  | 'Pilgrimage Site'
  | 'Pleasure World'
  | 'Police State'
  | 'Post-Scarcity'
  | 'Preceptor Archive'
  | 'Pretech Cultists'
  | 'Prison Planet'
  | 'Psionics Academy'
  | 'Psionics Fear'
  | 'Psionics Worship'
  | 'Quarantined World'
  | 'Radioactive World'
  | 'Refugees'
  | 'Regional Hegemon'
  | 'Restrictive Laws'
  | 'Revanchists'
  | 'Revolutionaries'
  | 'Rigid Culture'
  | 'Rising Hegemon'
  | 'Ritual Combat'
  | 'Robots'
  | 'Seagoing Cities'
  | 'Sealed Menace'
  | 'Secret Masters'
  | 'Sectarians'
  | 'Seismic Instability'
  | 'Shackled World'
  | 'Societal Despair'
  | 'Sole Supplier'
  | 'Taboo Treasure'
  | 'Terraform Failure'
  | 'Theocracy'
  | 'Tomb World'
  | 'Trade Hub'
  | 'Tyranny'
  | 'Unbraked AI'
  | 'Urbanized Surface'
  | 'Utopia'
  | 'Warlords'
  | 'Xenophobes'
  | 'Zombies';

export type Atmosphere =
  | 'Vacuum'
  | 'Corrosive'
  | 'Invasive'
  | 'Corrosive+Invasive'
  | 'Inert gas'
  | 'Breathable: Thin/Thick'
  | 'Breathable';

export type Temperature =
  | 'Cryogenic'
  | 'Deepfrozen'
  | 'Polar'
  | 'Subarctic'
  | 'Boreal'
  | 'Alpine'
  | 'Temperate (chilly)'
  | 'Temperate'
  | 'Temperate (warm)'
  | 'Mediterranean'
  | 'Subtropical'
  | 'Equatorial'
  | 'Scorching'
  | 'Infernal'
  | 'Furance';

export type NativeBiosphere = 'None' | 'Microbial' | 'Limited' | 'Significant' | 'Engineered';

export type TerranBiosphere = NativeBiosphere;

export type Population =
  | 'Fewer than 500'
  | 'Fewer than a million inhabitants'
  | 'Several million inhabitants'
  | 'Hundreds of millions of inhabitants'
  | 'Billions of inhabitants';

export type TechLevel =
  | 'Neolithic-level technology'
  | 'Medieval technology'
  | 'Early Industrial Age tech'
  | 'Tech like that of present-day Earth'
  | 'Modern postech'
  | 'Postech with specialties'
  | 'Pretech with surviving infrastructure';

export type Size = 'Luna' | 'Mars' | 'Earth' | 'Super-Earth' | 'Neptune' | 'Jupiter';

export type BulkComposition =
  | 'Sulfur'
  | 'Carbon'
  | 'Magnesium'
  | 'Calcium-Aluminum'
  | 'Iron'
  | 'Water'
  | 'Silicon'
  | 'Jovian Gas'
  | 'Neptunian Gas';

export interface InhabitedInfo {
  TotalHab: number;
  WorldTags: [WorldTag, WorldTag];
  TerranBiosphere: TerranBiosphere;
  Population: Population;
  TechLevel: TechLevel;
}

/** Current generator POI table entries, retained as a closed domain vocabulary. */
export type PointOfInterestType =
  | 'Deep-space station'
  | 'Asteroid base'
  | 'Remote moon base'
  | 'Ancient orbital ruin'
  | 'Research base'
  | 'Asteroid belt'
  | 'Comet base'
  | 'Comet belt'
  | 'Gas Mine'
  | 'Refueling station';

export interface PointOfInterest extends SelectableEntity {
  /** The system object that contains this point of interest. */
  ParentObjectId: Guid;
  POIType: PointOfInterestType;
}

/** Every entity that may be selected, inspected, or given visibility. */
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

/** Runtime values for the serialized VisibilityLevel union. */
export const VisibilityLevel = {
  NONE: 'NONE',
  BASIC_SCAN: 'BASIC_SCAN',
  CULTURE_PARTIAL: 'CULTURE_PARTIAL',
  CULTURE_FULL: 'CULTURE_FULL',
} as const;
