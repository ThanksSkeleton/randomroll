import seedrandom from "seedrandom";
import rawSystemPoints from "../../../swn_sector/system_points_of_interest.json";
import rawStarTypes from "../../../swn_sector/star_types.json";
import rawWorldAttributes from "../../../swn_sector/world_attributes_2.json";
import {
  generateSectorV3,
  isV2WorldValid,
  type SectorV2Options,
  type StarSystemV3,
} from "./sector_v2";

export type OrbitalPositionCategory = "TooHot" | "Goldilocks" | "TooCold_1" | "IngressEgress" | "TooCold_3";
export type LocationKind = "PrimaryPlanet" | "EgressIngressRegion" | "ExtraWorld" | "ParentGasGiant" | "IndependentOrbit";
export type ExtraWorldCategory = "TerrestrialPlanet" | "GasGiant" | "OtherObject";

export type SystemLocationV4 = {
  id: string;
  kind: LocationKind;
  orbitalPositionCategory: OrbitalPositionCategory;
  /** One-based sequence among this system's objects in the same orbital region. */
  orbitalOrder: number;
  /** Symbolic orbital distance, in astronomical units. */
  au: number;
  archetype?: string;
  category?: ExtraWorldCategory;
  worldId?: string;
  isPrimary?: boolean;
  habitableSlot?: 1 | 2 | 3;
  parentLocationId?: string;
  pointIds: string[];
};

export type PointOfInterestV4 = {
  id: string;
  kind: "Ingress Point" | "Egress Point" | "Other";
  point: string;
  locationId: string;
  roll?: number;
  occupant?: string;
  situation?: string;
};

export type StarSystemV4 = StarSystemV3 & {
  locations: SystemLocationV4[];
  pointsOfInterest: PointOfInterestV4[];
};

export type SectorV4 = {
  version: "v4";
  seed: string;
  starCount: number;
  systems: StarSystemV4[];
};

type RawArchetype = { archetype: string; description: string; category: ExtraWorldCategory };
type RawPoint = {
  roll: number;
  point: string;
  occupants: Array<{ roll: string; result: string }>;
  situations: Array<{ roll: string; result: string }>;
};
type RawStarType = {
  roll: number | string;
  result: string;
  hab: number;
  habitableSlots: number;
  orbitalZones: {
    tooHot: string;
    habitable: string | null;
    tooCold1: string;
    warpPoint: string;
    tooCold2: string;
    beyond: string;
  };
};

type V4Data = {
  orbitalPositionCategories: OrbitalPositionCategory[];
  requiredLocations: Array<{ kind: "EgressIngressRegion"; orbitalPositionCategory: "IngressEgress" }>;
  extraWorlds: {
    countDice: "1d6";
    minimumByOrbitalPosition: { TooHot: number; TooCold_1: number };
    maximumByOrbitalPosition: { TooCold_3: number };
    goldilocksOpenSlotExtraChance: number;
    eligibleArchetypes: string[];
    allowedOrbitalPositionCategories: Record<string, OrbitalPositionCategory[]>;
    moonRules: {
      terrestrialExtraWorldMayOrbitGasGiant: boolean;
      terrestrialExtraWorldMoonChance: string;
      primaryPlanetMoonCreatesParentGasGiant: boolean;
      parentGasGiantMayUseGoldilocks: boolean;
    };
  };
  pointsOfInterest: {
    minimumIngressPoints: number;
    minimumEgressPoints: number;
    otherCountDice: "1d4+1";
    independentOrbit: {
      kind: "IndependentOrbit";
      createdByPoint: "Deep-space station";
      onlyContainsPoint: "Deep-space station";
      allowedOrbitalPositionCategories: Array<"TooHot" | "TooCold_1" | "TooCold_3">;
    };
  };
};

const systemPointData = rawSystemPoints as {
  v4: V4Data;
  extraWorlds: { archetypes: RawArchetype[] };
  otherPoint: { rows: RawPoint[] };
};
const starTypeRows = (rawStarTypes as { tables: Array<{ id: string; rows: RawStarType[] }> }).tables
  .find(table => table.id === "star_type")?.rows ?? [];
const gasGiantMoonTable = (rawWorldAttributes as {
  tables: Array<{ id: string; dice: string; rows: Array<{ roll: number | string; result: "Yes" | "No" }> }>;
}).tables.find(table => table.id === "gas_giant_moon");
const v4 = systemPointData.v4;
const archetypesByName = new Map(systemPointData.extraWorlds.archetypes.map(archetype => [archetype.archetype, archetype]));
const eligibleArchetypes = v4.extraWorlds.eligibleArchetypes.map(name => {
  const archetype = archetypesByName.get(name);
  if (archetype === undefined) throw new Error(`Missing V4 extra-world archetype ${name}`);
  return archetype;
});

function rollDie(rng: seedrandom.PRNG, sides: number): number {
  return Math.floor(rng() * sides) + 1;
}

function choose<T>(rng: seedrandom.PRNG, values: readonly T[]): T {
  if (values.length === 0) throw new Error("Cannot choose from an empty set");
  return values[rollDie(rng, values.length) - 1]!;
}

function thermalOrbit(world: StarSystemV3["worlds"][number]): string {
  const thermalOrbit = world.attributes.temperature.thermalOrbit;
  if (thermalOrbit === undefined) throw new Error(`Missing thermal orbit for ${world.id}`);
  return thermalOrbit;
}

function worldPosition(world: StarSystemV3["worlds"][number]): OrbitalPositionCategory {
  const orbit = thermalOrbit(world);
  switch (orbit) {
    case "Too Hot": return "TooHot";
    case "Too Cold": return "TooCold_1";
    case "Hot":
    case "Temperate":
    case "Cold": return "Goldilocks";
    default: throw new Error(`Missing or invalid thermal orbit for ${world.id}`);
  }
}

/** Returns a Goldilocks slot preference; extreme worlds use no habitable slot. */
export function preferredGoldilocksSlot(orbit: string): 1 | 2 | 3 | undefined {
  switch (orbit) {
    case "Hot": return 1;
    case "Temperate": return 2;
    case "Cold": return 3;
    case "Too Hot":
    case "Too Cold": return undefined;
    default: throw new Error(`Invalid thermal orbit ${orbit}`);
  }
}

/** Assigns unique numbered Goldilocks slots, with input order breaking thermal ties. */
export function assignGoldilocksSlots(
  worlds: readonly { id: string; thermalOrbit: string }[],
  habitableSlots: number,
): Map<string, 1 | 2 | 3> {
  const available = Array.from({ length: habitableSlots }, (_, index) => index + 1);
  const assignments = new Map<string, 1 | 2 | 3>();
  const eligible = worlds
    .map((world, index) => ({ world, index, preferred: preferredGoldilocksSlot(world.thermalOrbit) }))
    .filter((entry): entry is { world: { id: string; thermalOrbit: string }; index: number; preferred: 1 | 2 | 3 } => entry.preferred !== undefined)
    .sort((left, right) => left.preferred - right.preferred || left.index - right.index);
  if (eligible.length > available.length) throw new Error("Insufficient Goldilocks slots");
  for (const entry of eligible) {
    const selectedIndex = available.reduce((best, slot, index) =>
      Math.abs(slot - entry.preferred) < Math.abs(available[best]! - entry.preferred) ? index : best, 0);
    assignments.set(entry.world.id, available.splice(selectedIndex, 1)[0]! as 1 | 2 | 3);
  }
  return assignments;
}

function matchesRoll(roll: number, range: number | string): boolean {
  if (typeof range === "number") return roll === range;
  const [start, end = start] = range.split("-").map(Number);
  return roll >= start! && roll <= end!;
}

function rollGasGiantMoon(rng: seedrandom.PRNG): boolean {
  if (gasGiantMoonTable?.dice !== "d100") throw new Error("Missing d100 gas_giant_moon table");
  const roll = rollDie(rng, 100);
  const row = gasGiantMoonTable.rows.find(candidate => matchesRoll(roll, candidate.roll));
  if (row === undefined) throw new Error("No gas-giant-moon result");
  return row.result === "Yes";
}

function selectV4Star(rng: seedrandom.PRNG, system: StarSystemV3): StarSystemV3["primaryStar"] {
  const requiredHab = Math.max(...system.worlds.map(world => world.calculatedHab));
  const requiredSlots = system.worlds.filter(world => preferredGoldilocksSlot(thermalOrbit(world)) !== undefined).length;
  for (let attempts = 0; attempts < 10_000; attempts += 1) {
    const roll = rollDie(rng, 100);
    const row = starTypeRows.find(candidate => matchesRoll(roll, candidate.roll));
    if (row !== undefined && row.hab >= requiredHab && row.habitableSlots >= requiredSlots) {
      return { roll, result: row.result, hab: row.hab, habitableSlots: row.habitableSlots };
    }
  }
  throw new Error("Unable to select a V4-compatible star type");
}

function allowedPositions(archetype: RawArchetype): OrbitalPositionCategory[] {
  return v4.extraWorlds.allowedOrbitalPositionCategories[archetype.archetype]
    ?? v4.extraWorlds.allowedOrbitalPositionCategories[archetype.category]
    ?? [];
}

function numericRange(text: string): [number, number] {
  const values = text.match(/\d+(?:\.\d+)?/g)?.map(Number);
  if (values === undefined || values.length < 2) throw new Error(`Invalid AU range ${text}`);
  return [values[0]!, values[1]!];
}

function warpPoint(text: string): number {
  const value = Number(text.match(/\d+(?:\.\d+)?/)?.[0]);
  if (Number.isNaN(value)) throw new Error(`Invalid warp-point AU ${text}`);
  return value;
}

function auRange(star: StarSystemV3["primaryStar"], category: OrbitalPositionCategory): [number, number] {
  const row = starTypeRows.find(candidate => matchesRoll(star.roll, candidate.roll));
  if (row === undefined) throw new Error(`Missing orbital zones for ${star.result}`);
  switch (category) {
    case "TooHot": return numericRange(row.orbitalZones.tooHot);
    case "Goldilocks": {
      if (row.orbitalZones.habitable === null) throw new Error(`${star.result} has no habitable AU range`);
      return numericRange(row.orbitalZones.habitable);
    }
    case "TooCold_1": return numericRange(row.orbitalZones.tooCold1);
    case "IngressEgress": {
      const au = warpPoint(row.orbitalZones.warpPoint);
      return [au, au];
    }
    case "TooCold_3": return numericRange(row.orbitalZones.tooCold2);
  }
}

function assignOrbitalPositions(system: StarSystemV3, locations: SystemLocationV4[], rng: seedrandom.PRNG): void {
  for (const category of v4.orbitalPositionCategories) {
    const inRegion = locations.filter(location => location.orbitalPositionCategory === category);
    if (inRegion.length === 0) continue;
    const [minimumAu, maximumAu] = auRange(system.primaryStar, category);
    inRegion.forEach((location, index) => {
      location.orbitalOrder = index + 1;
      const subdivisionWidth = (maximumAu - minimumAu) / inRegion.length;
      location.au = minimumAu + subdivisionWidth * (index + rng());
    });
  }
}

function eligibleArchetypesFor(position: OrbitalPositionCategory): RawArchetype[] {
  return eligibleArchetypes.filter(archetype => allowedPositions(archetype).includes(position));
}

function otherPointCandidates(locations: readonly SystemLocationV4[]): RawPoint[] {
  return systemPointData.otherPoint.rows.filter(row => row.point === "Deep-space station" || pointLocationCandidates(row, locations).length > 0);
}

function gasGiantCanHostPoint(location: SystemLocationV4, locations: readonly SystemLocationV4[]): boolean {
  return location.category !== "GasGiant" || !locations.some(candidate =>
    candidate.parentLocationId === location.id && candidate.kind === "PrimaryPlanet");
}

function pointLocationCandidates(row: RawPoint, locations: readonly SystemLocationV4[]): SystemLocationV4[] {
  const candidates = row.point === "Asteroid base" || row.point === "Asteroid belt"
    ? locations.filter(location => location.archetype === "AsteroidBelt")
    : row.point === "Remote moon base"
      ? locations.filter(location => location.kind === "ExtraWorld" && location.category === "TerrestrialPlanet")
      : row.point === "Ancient orbital ruin" || row.point === "Research base"
        ? locations.filter(location => location.kind === "ExtraWorld" && (location.category === "TerrestrialPlanet" || location.category === "GasGiant"))
        : locations.filter(location => location.category === "GasGiant");
  return candidates.filter(location => gasGiantCanHostPoint(location, locations));
}

function locationForOtherPoint(row: RawPoint, locations: SystemLocationV4[], createId: () => string, rng: seedrandom.PRNG): SystemLocationV4 {
  if (row.point === v4.pointsOfInterest.independentOrbit.createdByPoint) {
    const location: SystemLocationV4 = {
      id: createId(),
      kind: "IndependentOrbit",
      orbitalPositionCategory: choose(rng, v4.pointsOfInterest.independentOrbit.allowedOrbitalPositionCategories),
      orbitalOrder: 0,
      au: 0,
      archetype: "IndependentOrbit",
      category: "OtherObject",
      pointIds: [],
    };
    locations.push(location);
    return location;
  }
  const candidates = pointLocationCandidates(row, locations);
  if (candidates.length === 0) throw new Error(`No eligible location for ${row.point}`);
  return candidates[0]!;
}

function buildSystemV4(system: StarSystemV3, rng: seedrandom.PRNG): StarSystemV4 {
  const locations: SystemLocationV4[] = [];
  const pointsOfInterest: PointOfInterestV4[] = [];
  let locationNumber = 0;
  let pointNumber = 0;
  const createLocationId = () => `${system.id}-location-${String(++locationNumber).padStart(2, "0")}`;
  const goldilocksSlots = assignGoldilocksSlots(
    system.worlds.map(world => ({ id: world.id, thermalOrbit: thermalOrbit(world) })),
    system.primaryStar.habitableSlots,
  );
  const addPoint = (point: Omit<PointOfInterestV4, "id">) => {
    const record = { id: `${system.id}-poi-${String(++pointNumber).padStart(2, "0")}`, ...point };
    pointsOfInterest.push(record);
    const location = locations.find(candidate => candidate.id === record.locationId);
    if (location === undefined) throw new Error(`Missing location ${record.locationId}`);
    location.pointIds.push(record.id);
  };

  for (const world of system.worlds) {
    const primaryLocation: SystemLocationV4 = {
      id: createLocationId(),
      kind: "PrimaryPlanet",
      orbitalPositionCategory: worldPosition(world),
      orbitalOrder: 0,
      au: 0,
      archetype: "PrimaryPlanet",
      category: "TerrestrialPlanet",
      worldId: world.id,
      isPrimary: world.isPrimary,
      ...(goldilocksSlots.has(world.id) ? { habitableSlot: goldilocksSlots.get(world.id) } : {}),
      pointIds: [],
    };
    locations.push(primaryLocation);
    if (world.isPrimary && world.planetDetails.isGasGiantMoon && v4.extraWorlds.moonRules.primaryPlanetMoonCreatesParentGasGiant) {
      const parent: SystemLocationV4 = {
        id: createLocationId(),
        kind: "ParentGasGiant",
        orbitalPositionCategory: primaryLocation.orbitalPositionCategory,
        orbitalOrder: 0,
        au: 0,
        archetype: "Jovian",
        category: "GasGiant",
        pointIds: [],
      };
      locations.push(parent);
      primaryLocation.parentLocationId = parent.id;
    }
  }

  const occupiedGoldilocksSlots = new Set(locations.flatMap(location => location.habitableSlot === undefined ? [] : [location.habitableSlot]));
  const openGoldilocksSlots = Array.from({ length: system.primaryStar.habitableSlots }, (_, index) => (index + 1) as 1 | 2 | 3)
    .filter(slot => !occupiedGoldilocksSlots.has(slot));
  if (openGoldilocksSlots.length > 0 && rng() < v4.extraWorlds.goldilocksOpenSlotExtraChance) {
    const archetype = choose(rng, eligibleArchetypes.filter(candidate => candidate.category === "TerrestrialPlanet" || candidate.category === "GasGiant"));
    locations.push({
      id: createLocationId(), kind: "ExtraWorld", orbitalPositionCategory: "Goldilocks", habitableSlot: choose(rng, openGoldilocksSlots),
      orbitalOrder: 0, au: 0,
      archetype: archetype.archetype, category: archetype.category, pointIds: [],
    });
  }

  const region = v4.requiredLocations[0];
  const egressIngressLocation: SystemLocationV4 = {
    id: createLocationId(), kind: region.kind, orbitalPositionCategory: region.orbitalPositionCategory, orbitalOrder: 0, au: 0, pointIds: [],
  };
  locations.push(egressIngressLocation);
  for (let index = 0; index < v4.pointsOfInterest.minimumIngressPoints; index += 1) {
    addPoint({ kind: "Ingress Point", point: "Ingress Point", locationId: egressIngressLocation.id });
  }
  for (let index = 0; index < v4.pointsOfInterest.minimumEgressPoints; index += 1) {
    addPoint({ kind: "Egress Point", point: "Egress Point", locationId: egressIngressLocation.id });
  }

  // A d6 result of one is raised to two so the two required extreme-orbit worlds fit.
  const extraWorldCount = Math.max(2, rollDie(rng, 6));
  const forcedPositions: OrbitalPositionCategory[] = [
    ...Array(v4.extraWorlds.minimumByOrbitalPosition.TooHot).fill("TooHot"),
    ...Array(v4.extraWorlds.minimumByOrbitalPosition.TooCold_1).fill("TooCold_1"),
  ];
  let tooColdBCount = 0;
  for (let index = 0; index < extraWorldCount; index += 1) {
    const forcedPosition = forcedPositions[index];
    const archetype = choose(rng, forcedPosition === undefined
      ? eligibleArchetypes.filter(candidate => allowedPositions(candidate).some(position =>
        position !== "TooCold_3" || tooColdBCount < v4.extraWorlds.maximumByOrbitalPosition.TooCold_3))
      : eligibleArchetypesFor(forcedPosition));
    const gasGiants = locations.filter(location => location.category === "GasGiant"
      && location.orbitalPositionCategory !== "Goldilocks"
      && (location.orbitalPositionCategory !== "TooCold_3" || tooColdBCount < v4.extraWorlds.maximumByOrbitalPosition.TooCold_3));
    const parent = forcedPosition === undefined && archetype.category === "TerrestrialPlanet" && gasGiants.length > 0
      && v4.extraWorlds.moonRules.terrestrialExtraWorldMayOrbitGasGiant && rollGasGiantMoon(rng)
      ? choose(rng, gasGiants)
      : undefined;
    const permittedPositions = forcedPosition === undefined
      ? allowedPositions(archetype).filter(position => position !== "TooCold_3" || tooColdBCount < v4.extraWorlds.maximumByOrbitalPosition.TooCold_3)
      : [forcedPosition];
    const orbitalPositionCategory = parent?.orbitalPositionCategory ?? choose(rng, permittedPositions);
    if (orbitalPositionCategory === "TooCold_3") tooColdBCount += 1;
    locations.push({
      id: createLocationId(), kind: "ExtraWorld", orbitalPositionCategory,
      orbitalOrder: 0, au: 0,
      archetype: archetype.archetype, category: archetype.category, parentLocationId: parent?.id, pointIds: [],
    });
  }

  const otherPointCount = rollDie(rng, 4) + 1;
  for (let index = 0; index < otherPointCount; index += 1) {
    const row = choose(rng, otherPointCandidates(locations));
    const location = locationForOtherPoint(row, locations, createLocationId, rng);
    addPoint({
      kind: "Other", point: row.point, locationId: location.id, roll: row.roll,
      occupant: choose(rng, row.occupants).result, situation: choose(rng, row.situations).result,
    });
  }
  assignOrbitalPositions(system, locations, rng);
  return { ...system, locations, pointsOfInterest };
}

/** Generates V3 stars and worlds, then adds V4's deterministic location and POI hierarchy. */
export function generateSectorV4(seed: string, options: SectorV2Options = {}): SectorV4 {
  const v3 = generateSectorV3(seed, options);
  const rng = seedrandom(`${seed}:v4`);
  const systems = v3.systems.map(system => {
    const primaryStar = selectV4Star(rng, system);
    return buildSystemV4({
      ...system,
      primaryStar,
      worlds: system.worlds.map(world => ({
        ...world,
        planetDetails: { ...world.planetDetails, tidallyLocked: primaryStar.result === "M-type" || worldPosition(world) === "TooHot" },
      })),
    }, rng);
  });
  return { version: "v4", seed, starCount: v3.starCount, systems };
}

/** Validates V4's location ownership, orbital placement, moon hierarchy, and POI counts. */
export function isV4SystemValid(system: StarSystemV4): boolean {
  const requiredHab = Math.max(...system.worlds.map(world => world.calculatedHab));
  const starRow = starTypeRows.find(row => matchesRoll(system.primaryStar.roll, row.roll));
  if (system.worlds.length === 0 || !system.worlds.every(isV2WorldValid)
    || starRow?.result !== system.primaryStar.result || system.primaryStar.hab < requiredHab) return false;
  const locationById = new Map(system.locations.map(location => [location.id, location]));
  const egressIngress = system.locations.filter(location => location.kind === "EgressIngressRegion" && location.orbitalPositionCategory === "IngressEgress");
  const ingress = system.pointsOfInterest.filter(point => point.kind === "Ingress Point");
  const egress = system.pointsOfInterest.filter(point => point.kind === "Egress Point");
  const other = system.pointsOfInterest.filter(point => point.kind === "Other");
  return egressIngress.length === 1
    && system.locations.filter(location => location.kind === "PrimaryPlanet").length >= 1
    && system.locations.filter(location => location.kind === "ExtraWorld").length >= 2
    && system.locations.filter(location => location.kind === "ExtraWorld").length <= 7
    && system.locations.filter(location => location.kind === "ExtraWorld" && location.orbitalPositionCategory === "TooHot").length >= v4.extraWorlds.minimumByOrbitalPosition.TooHot
    && system.locations.filter(location => location.kind === "ExtraWorld" && location.orbitalPositionCategory === "TooCold_1").length >= v4.extraWorlds.minimumByOrbitalPosition.TooCold_1
    && system.locations.filter(location => location.kind === "ExtraWorld" && location.orbitalPositionCategory === "TooCold_3").length <= v4.extraWorlds.maximumByOrbitalPosition.TooCold_3
    && ingress.length >= v4.pointsOfInterest.minimumIngressPoints
    && egress.length >= v4.pointsOfInterest.minimumEgressPoints
    && other.length >= 2 && other.length <= 5
    && system.pointsOfInterest.every(point => locationById.has(point.locationId))
    && system.locations.filter(location => location.kind === "PrimaryPlanet" && location.orbitalPositionCategory === "Goldilocks").every(location =>
      location.habitableSlot !== undefined && location.habitableSlot <= system.primaryStar.habitableSlots)
    && new Set(system.locations.filter(location => location.habitableSlot !== undefined).map(location => location.habitableSlot)).size
      === system.locations.filter(location => location.habitableSlot !== undefined).length
    && ingress.concat(egress).every(point => point.locationId === egressIngress[0]!.id)
    && system.locations.every(location => location.parentLocationId === undefined || locationById.has(location.parentLocationId))
    && system.locations.filter(location => location.kind === "IndependentOrbit").every(location =>
      location.pointIds.length === 1
        && system.pointsOfInterest.find(point => point.id === location.pointIds[0])?.point === "Deep-space station"
        && v4.pointsOfInterest.independentOrbit.allowedOrbitalPositionCategories.includes(location.orbitalPositionCategory as "TooHot" | "TooCold_1" | "TooCold_3"))
    && system.locations.filter(location => location.kind === "ExtraWorld").every(location => {
      const archetype = location.archetype === undefined ? undefined : archetypesByName.get(location.archetype);
      const parent = location.parentLocationId === undefined ? undefined : locationById.get(location.parentLocationId);
      return archetype !== undefined
        && (location.orbitalPositionCategory === "Goldilocks"
          ? location.habitableSlot !== undefined && location.habitableSlot <= system.primaryStar.habitableSlots
          : parent?.category === "GasGiant" || allowedPositions(archetype).includes(location.orbitalPositionCategory));
    });
}
