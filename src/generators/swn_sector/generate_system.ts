import type { HexLocation, OtherCelestialObject, PointOfInterest, PointOfInterestType, Planet, StarSystem, StarType, SystemObject } from "./merged_schema";
import { choose, chooseWeighted, deterministicId, randomFor, rollDie, shuffled } from "./generation_random";
import { directOrbitAuBand, directOrbitTemperatures, isPoiHostCompatible, POI_TABLE } from "./generation_rules";
import { generateInhabitedPlanet } from "./generate_inhabited_planet";
import { generateTemplatePlanet, templateHasUsableTemperature, type ExtraPlanetTemplate } from "./planet_templates";

/** Assign distinct open-interval AU values without changing any physical fact. */
export function assignDirectOrbitAus(seed: string, entityPath: string, starType: StarType, objects: readonly SystemObject[]): SystemObject[] {
  const directObjects = objects.filter(object => object.Orbit.ParentObjectId === null);
  const auById = new Map<string, number>();
  const groups = new Map<SystemObject["Temperature"], SystemObject[]>();
  for (const object of directObjects) {
    const group = groups.get(object.Temperature) ?? [];
    group.push(object);
    groups.set(object.Temperature, group);
  }
  for (const [temperature, group] of groups) {
    const [minimum, maximum] = directOrbitAuBand(starType, temperature);
    if (maximum <= minimum) throw new Error(`No direct-orbit AU interval for ${seed}:${entityPath}:${temperature}`);
    const ordered = shuffled(randomFor(seed, `${entityPath}:au:${temperature}`), group);
    const width = (maximum - minimum) / ordered.length;
    ordered.forEach((object, index) => {
      const random = randomFor(seed, `${entityPath}:au:${temperature}:${object.Id}`);
      auById.set(object.Id, minimum + width * (index + random()));
    });
  }
  return objects.map(object => {
    if (object.Orbit.ParentObjectId !== null) return object;
    return { ...object, Orbit: { ...object.Orbit, AU: auById.get(object.Id)! } };
  }).sort((left, right) => left.Orbit.AU - right.Orbit.AU || (left.Orbit.ParentObjectId === null ? -1 : 1));
}

export type GenerateSystemOptions = {
  seed: string;
  entityPath: string;
  hexLocation: HexLocation;
  starType: StarType;
  starHabitability: number;
};

const EXTRA_TEMPLATES: readonly ExtraPlanetTemplate[] = ["Mercurian", "Europan / Plutonic", "Lunar", "Ioan", "Titanian", "Martian", "Venusian", "Jovian", "Neptunian"];

function inhabitedCount(seed: string, path: string): number {
  const roll = rollDie(randomFor(seed, `${path}:inhabited-count`), 100);
  return roll <= 85 ? 1 : roll <= 95 ? 2 : 3;
}

/** Builds physical system objects only; POIs are added by the next construction slice. */
export function generateSystem(options: GenerateSystemOptions): StarSystem {
  const name = `System ${options.entityPath}`;
  const objects: SystemObject[] = [];
  const moons: Planet[] = [];
  const count = inhabitedCount(options.seed, options.entityPath);
  for (let index = 0; index < count; index += 1) {
    const worldPath = `${options.entityPath}:inhabited:${String(index + 1).padStart(2, "0")}`;
    const isMoon = rollDie(randomFor(options.seed, `${worldPath}:moon`), 100) <= 10;
    if (!isMoon) {
      objects.push(generateInhabitedPlanet({ seed: options.seed, entityPath: worldPath, starType: options.starType, starHabitability: options.starHabitability, orbit: { AU: 0, AngleDegrees: randomFor(options.seed, `${worldPath}:angle`)() * 360, ParentObjectId: null } }));
      continue;
    }
    const parentPath = `${worldPath}:parent`;
    const parent = generateTemplatePlanet({ seed: options.seed, entityPath: parentPath, starType: options.starType, template: "Jovian", orbit: { AU: 0, AngleDegrees: randomFor(options.seed, `${parentPath}:angle`)() * 360, ParentObjectId: null } });
    objects.push(parent);
    moons.push(generateInhabitedPlanet({ seed: options.seed, entityPath: worldPath, starType: options.starType, starHabitability: options.starHabitability, allowedTemperatures: [parent.Temperature], orbit: { AU: 0, AngleDegrees: randomFor(options.seed, `${worldPath}:angle`)() * 360, ParentObjectId: parent.Id } }));
  }
  const extraTarget = Math.max(2, rollDie(randomFor(options.seed, `${options.entityPath}:extra-count`), 6));
  while (objects.length - count < extraTarget) {
    const index = objects.length + 1;
    const path = `${options.entityPath}:extra:${String(index).padStart(2, "0")}`;
    const templates = EXTRA_TEMPLATES.filter(template => templateHasUsableTemperature(template, options.starType));
    objects.push(generateTemplatePlanet({ seed: options.seed, entityPath: path, starType: options.starType, template: choose(randomFor(options.seed, `${path}:template`), templates, "extra-world templates"), orbit: { AU: 0, AngleDegrees: randomFor(options.seed, `${path}:angle`)() * 360, ParentObjectId: null } }));
  }
  const directPlaced = assignDirectOrbitAus(options.seed, options.entityPath, options.starType, [...objects, ...moons]);
  const directById = new Map(directPlaced.map(object => [object.Id, object]));
  const placed = directPlaced.map(object => {
    if (object.Orbit.ParentObjectId === null) return object;
    const parent = directById.get(object.Orbit.ParentObjectId);
    if (parent === undefined) throw new Error(`Missing moon parent for ${options.seed}:${object.Id}`);
    return { ...object, Temperature: parent.Temperature, Orbit: { ...object.Orbit, AU: parent.Orbit.AU } };
  });
  const parentById = new Map(placed.map(object => [object.Id, object]));
  for (const moon of moons) {
    const placedMoon = parentById.get(moon.Id);
    if (placedMoon === undefined) throw new Error(`Missing generated moon ${moon.Id}`);
  }
  return {
    Id: deterministicId(options.seed, options.entityPath),
    ProceduralName: name,
    NiceName: name,
    VisibilityLevel: "NONE",
    Intelligence: { InfoboxSummary: `${options.starType} system.`, BasicScan: `${placed.length} orbiting objects.`, CulturePartial: "", CultureFull: "", GM: "" },
    HexLocation: options.hexLocation,
    Star: { Id: deterministicId(options.seed, `${options.entityPath}:star`), ProceduralName: `${name} star`, NiceName: `${name} star`, VisibilityLevel: "NONE", Intelligence: { InfoboxSummary: options.starType, BasicScan: `Habitability ${options.starHabitability}.`, CulturePartial: "", CultureFull: "", GM: "" }, StarType: options.starType, HabitabilityRating: options.starHabitability },
    Objects: placed.sort((left, right) => left.Orbit.AU - right.Orbit.AU || (left.Orbit.ParentObjectId === null ? -1 : 1)),
    PointsOfInterest: [],
  };
}

function inhabitedObjectCount(objects: readonly SystemObject[]): number {
  return objects.filter((object): object is Planet => object.Kind === "Planet" && object.InhabitedInfo !== false).length;
}

function makePoi(seed: string, path: string, parentObjectId: string, type: PointOfInterestType): PointOfInterest {
  const name = `${type} ${path}`;
  return {
    Id: deterministicId(seed, path),
    ProceduralName: name,
    NiceName: name,
    VisibilityLevel: "NONE",
    Intelligence: { InfoboxSummary: type, BasicScan: `Located at ${parentObjectId}.`, CulturePartial: "", CultureFull: "", GM: "" },
    ParentObjectId: parentObjectId,
    POIType: type,
  };
}

/** Adds only constructively feasible POIs; it never generates and repairs an invalid host. */
export function populatePointsOfInterest(seed: string, entityPath: string, system: StarSystem): StarSystem {
  const target = rollDie(randomFor(seed, `${entityPath}:poi-count`), 4) + 1;
  const objects = [...system.Objects];
  const pois: PointOfInterest[] = [];
  const capacity = new Map<string, number>();
  for (let index = 0; index < target; index += 1) {
    const eligible = POI_TABLE.filter(row => row.Value !== "Deep-space station").flatMap(row => objects
      .filter(object => (capacity.get(object.Id) ?? 0) < 3 && isPoiHostCompatible(row.Value, object) && !(object.Kind === "Planet" && object.InhabitedInfo !== false) && !objects.some(candidate => candidate.Orbit.ParentObjectId === object.Id && candidate.Kind === "Planet" && candidate.InhabitedInfo !== false))
      .map(object => ({ Value: { type: row.Value, host: object }, Weight: row.Weight })));
    const extraCount = objects.length - inhabitedObjectCount(objects);
    const canCreateStation = extraCount < 7;
    const candidates = canCreateStation
      ? [...eligible, { Value: { type: "Deep-space station" as const, host: undefined }, Weight: 1 }]
      : eligible;
    if (candidates.length === 0) throw new Error(`No feasible POI candidates for ${seed}:${entityPath}:${index}`);
    const selected = chooseWeighted(randomFor(seed, `${entityPath}:poi:${index}`), candidates, "POI candidates").Value;
    if (selected.type === "Deep-space station") {
      const stationPath = `${entityPath}:station:${index}`;
      const temperature = choose(randomFor(seed, `${stationPath}:temperature`), directOrbitTemperatures(system.Star.StarType), "station temperatures");
      const station: OtherCelestialObject = {
        Id: deterministicId(seed, stationPath),
        ProceduralName: `Independent station ${stationPath}`,
        NiceName: `Independent station ${stationPath}`,
        VisibilityLevel: "NONE",
        Intelligence: { InfoboxSummary: "Independent deep-space station.", BasicScan: temperature, CulturePartial: "", CultureFull: "", GM: "" },
        Kind: "OtherCelestialObject",
        ObjectType: "IndependentStation",
        Temperature: temperature,
        Orbit: { AU: 0, AngleDegrees: randomFor(seed, `${stationPath}:angle`)() * 360, ParentObjectId: null },
      };
      objects.push(station);
      pois.push(makePoi(seed, `${entityPath}:poi:${index}`, station.Id, selected.type));
      capacity.set(station.Id, 1);
      continue;
    }
    pois.push(makePoi(seed, `${entityPath}:poi:${index}`, selected.host.Id, selected.type));
    capacity.set(selected.host.Id, (capacity.get(selected.host.Id) ?? 0) + 1);
  }
  const placed = assignDirectOrbitAus(seed, `${entityPath}:with-pois`, system.Star.StarType, objects);
  const placedById = new Map(placed.map(object => [object.Id, object]));
  return {
    ...system,
    Objects: placed.map(object => {
      if (object.Orbit.ParentObjectId === null) return object;
      const parent = placedById.get(object.Orbit.ParentObjectId);
      if (parent === undefined) throw new Error(`Missing moon parent for ${seed}:${object.Id}`);
      return { ...object, Temperature: parent.Temperature, Orbit: { ...object.Orbit, AU: parent.Orbit.AU } };
    }).sort((left, right) => left.Orbit.AU - right.Orbit.AU || (left.Orbit.ParentObjectId === null ? -1 : 1)),
    PointsOfInterest: pois,
  };
}
