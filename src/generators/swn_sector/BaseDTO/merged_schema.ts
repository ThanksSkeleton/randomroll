/**
 * Canonical merged SWN sector schema.
 *
 * This is the Phase 1 design contract from SCHEMA_COMPARISON.html. It is
 * deliberately independent of the generator's working representation:
 * generation rolls, slot wrappers, orbital-zone categories, and ingress /
 * egress regions are implementation details and are not part of this model.
 */

export type Guid = string;
import type { SectorCulture } from './culture';

/** Independent scan availability. Valid states require BasicScan for all other
 * scans, and PoliticsScan for DeepPoliticsScan. */
export interface ScanVisibility {
  BasicScan: boolean;
  DetailedScan: boolean;
  PoliticsScan: boolean;
  DeepPoliticsScan: boolean;
}

export interface IntelligenceText {
  InfoboxSummary: string;
  BasicScan: string;
  DetailedScan: string;
  PoliticsScan: string;
  DeepPoliticsScan: string;
  GM: string;
}

/** Shared identity, naming, disclosure, and selection state. */
export interface SelectableEntity {
  Id: Guid;
  ProceduralName: string;
  NiceName: string;
  Visibility: ScanVisibility;
  Intelligence: IntelligenceText;
  /** Generated zero-based portrait variant choice, when applicable. */
  PortraitIndex?: number;
}

export interface Sector {
  SchemaVersion: 'merged-v7';
  /** Generation provenance; it is not a complete replay specification. */
  OriginalSeed: string;
  /** Starting-world eligibility mode selected when this sector was generated. */
  StartingWorldMode: StartingWorldMode;
  /** Stable generated-world reference; null until starting-world selection runs. */
  StartingWorldId: Guid | null;
  SectorName: string;
  Systems: StarSystem[];
  Routes: Route[];
  RoutePortals: RoutePortal[];
  Polities: Polity[];
  /** Generated history retained for future GM-facing presentation. */
  ConquestEvents: ConquestEvent[];
  PlayerShip: PlayerShip;
}

export interface Polity {
  Id: Guid;
  NiceName: string;
  HomeworldId: Guid;
  Flag: PolityFlag;
}

export type PolityFlagColor =
  | 'red'
  | 'orange'
  | 'gold'
  | 'yellow'
  | 'lime green'
  | 'green'
  | 'teal'
  | 'light blue'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'brown'
  | 'gray'
  | 'white';

export interface PolityFlag {
  /** Generated CSS hex color. Field colors are unique within a sector. */
  FieldColor: string;
  CircleColor: PolityFlagColor;
}

export interface ConquestEvent {
  Id: Guid;
  AttackerPolityId: Guid;
  DefenderPolityId: Guid;
  TargetWorldId: Guid;
  RouteDistance: number;
  Attack: number;
  Defense: number;
}

export type StartingWorldMode = 'UNRESTRICTED' | 'TL4_PLUS' | 'TL4_PLUS_POP_GT_500';

export interface Route extends SelectableEntity {
  PortalIds: [Guid, Guid];
}

/** One end of a route, located on its system's derived boundary. */
export interface RoutePortal extends SelectableEntity {
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
  HabitablePointsOfInterest: HabitablePointOfInterest[];
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
}

interface OrbitPosition {
  /** Inclusive at 0; exclusive at 360. */
  AngleDegrees: number;
}

/** Randomized star-relative AU; only direct orbits store it. */
export interface DirectOrbit extends OrbitPosition {
  AU: number;
  ParentObjectId: null;
}

/** A moon inherits its parent planet's AU. */
export interface MoonOrbit extends OrbitPosition {
  ParentObjectId: Guid;
}

export type Orbit = DirectOrbit | MoonOrbit;

export interface SystemObjectBase extends SelectableEntity {
  Orbit: Orbit;
  /** Surviving simultaneous political claims after the initial politics pass. */
  ClaimedByPolityIds: Guid[];
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
  Atmosphere: Atmosphere;
  NativeBiosphere: NativeBiosphere;
  InhabitedInfo: InhabitedInfo | false;
  /** Non-null after the culture pass or explicit GM completion. */
  Culture?: SectorCulture | null;
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

export type AtmosphereCategory =
  | 'Vacuum'
  | 'Corrosive'
  | 'Toxic'
  | 'Filter'
  | 'Pressure'
  | 'Flammable'
  | 'Inert'
  | 'Breathable'
  | 'GasGiant'
  | 'IceGiant';

/** Gas catalog ID using plain digits (for example, H2), distinct from its display formula. */
export type AtmosphereGasId = string;

export type AtmosphereOutcome =
  | {
      Category: 'Corrosive' | 'Toxic' | 'Filter' | 'Flammable' | 'Inert' | 'Breathable';
      SelectedGas: AtmosphereGasId;
    }
  | { Category: 'Pressure'; PressureResult: 'Low' | 'High' }
  | { Category: 'Vacuum' | 'GasGiant' | 'IceGiant' };

export type Atmosphere = AtmosphereOutcome;

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
  /** Deterministic polar placement used for POIs hosted by belts and gas clouds. */
  AngleDegrees: number;
}

export type HabitablePointOfInterestType =
  'Orbital Station' | 'Starport' | 'Planetary Defenses' | 'Garrison';

export interface HabitablePointOfInterest extends SelectableEntity {
  ParentWorldId: Guid;
  HPOIType: HabitablePointOfInterestType;
  /** One surviving claimant for Garrisons; null for other HPOIs. */
  AssignedPolityId: Guid | null;
  AngleDegrees: number;
}

/** Every entity that may be selected, inspected, or given visibility. */
export type SelectableObject =
  | StarSystem
  | Star
  | Planet
  | OtherCelestialObject
  | PointOfInterest
  | HabitablePointOfInterest
  | RoutePortal
  | Route
  | PlayerShip;

export type SelectableObjectKind =
  | 'System'
  | 'Star'
  | 'Planet'
  | 'OtherCelestialObject'
  | 'PointOfInterest'
  | 'HabitablePointOfInterest'
  | 'RoutePortal'
  | 'Route'
  | 'PlayerShip';

export const DEFAULT_SCAN_VISIBILITY: ScanVisibility = {
  BasicScan: false,
  DetailedScan: false,
  PoliticsScan: false,
  DeepPoliticsScan: false,
};
