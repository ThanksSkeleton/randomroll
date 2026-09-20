/** Deterministic prototype fixtures; reusable rules live in src/domain/sector. */
import { cloneSectorWithFreshIds, deleteSectorObject, updateObjectVisibility } from "./domain/sector/operations";
import { areAdjacentHexes } from "./domain/sector/selectors";
import { DetailsAndVisibility, Guid, PlayerShip, POI, Sector, Star, StarSystem, VisibilityLevel, World } from "./domain/sector/model";

export { areAdjacentHexes, findContainingSystem, findObject, getAllSelectableIds } from "./domain/sector/selectors";
export { validateSector } from "./domain/sector/validation";

const OCCUPIED_HEXES = [
  { X: 1, Y: 1 }, { X: 2, Y: 1 }, { X: 3, Y: 1 }, { X: 1, Y: 2 }, { X: 2, Y: 2 },
  { X: 2, Y: 3 }, { X: 3, Y: 3 }, { X: 4, Y: 3 }, { X: 2, Y: 4 }, { X: 3, Y: 4 },
  { X: 3, Y: 5 }, { X: 4, Y: 5 }, { X: 5, Y: 5 }, { X: 3, Y: 6 }, { X: 4, Y: 6 },
  { X: 4, Y: 7 }, { X: 5, Y: 7 }, { X: 3, Y: 8 }, { X: 4, Y: 8 }, { X: 5, Y: 8 },
];

let generatedGuidCounter = 0;
function hashString(value: string): number { let hash = 2166136261; for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); } return hash >>> 0; }
function deterministicGuid(value: string): Guid { let state = hashString(value); const words: string[] = []; for (let index = 0; index < 4; index += 1) { state = (Math.imul(state ^ (state >>> 16), 2246822519) + 3266489917) >>> 0; words.push(state.toString(16).padStart(8, "0")); } const hex = words.join(""); return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${(8 + (parseInt(hex.slice(16, 17), 16) % 4)).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`; }
function freshGuid(): Guid { const browserCrypto = globalThis.crypto; if (browserCrypto && typeof browserCrypto.randomUUID === "function") return browserCrypto.randomUUID(); generatedGuidCounter += 1; return deterministicGuid(`generated-${generatedGuidCounter}-${Date.now()}`); }
function fixtureGuid(sectorKey: string, kind: string, index: number): Guid { return deterministicGuid(`${sectorKey}:${kind}:${index}`); }
function randomLetters(value: string): string { let state = hashString(value); let result = ""; for (let index = 0; index < 8; index += 1) { state = (Math.imul(state ^ (state >>> 13), 1274126177) + 1013904223) >>> 0; result += String.fromCharCode(65 + (state % 26)); } return result; }
function visibilityFor(index: number): VisibilityLevel { return [VisibilityLevel.NONE, VisibilityLevel.BASIC_SCAN, VisibilityLevel.CULTURE_PARTIAL, VisibilityLevel.CULTURE_FULL][index % 4]; }

function addDetails(details: DetailsAndVisibility[], id: Guid, proceduralName: string, index: number, kind: string): void {
  details.push({ Id: id, ProceduralName: proceduralName, NiceName: randomLetters(`${proceduralName}:${kind}:${index}`), VisibilityLevel: visibilityFor(index), InfoboxSummary: { Text: `${kind} survey summary for ${proceduralName}.` }, Details_Basic_Scan: { Text: `${kind} basic survey data for ${proceduralName}.` }, Details_Culture_Partial: { Text: `${kind} partial cultural profile for ${proceduralName}.` }, Details_Culture_Full: { Text: `${kind} advanced report: population, trade, and technology records available.` }, Details_GM: { Text: `GM-only notes for ${proceduralName}: unresolved faction activity detected.` } });
}

function createMockSector(sectorKey: string, seed: string, sectorName: string): Sector {
  const details: DetailsAndVisibility[] = []; const systems: StarSystem[] = [];
  OCCUPIED_HEXES.forEach((hex, systemIndex) => {
    const systemId = fixtureGuid(sectorKey, "system", systemIndex); const starId = fixtureGuid(sectorKey, "star", systemIndex);
    const star: Star = { Id: starId, StarType: ["G", "K", "M", "F"][systemIndex % 4] };
    const worlds: World[] = []; const worldTypes = ["Mercury", "Luna", "Mars", "Earth", "Venus", "Neptune", "Uranus", "Jupiter", "Saturn"]; const planetCount = 2 + (hashString(`${sectorKey}:planets:${systemIndex}`) % 4); const planetAu = [0.4, 1.2, 2.4, 4.0, 6.2];
    for (let worldIndex = 0; worldIndex < planetCount; worldIndex += 1) {
      const worldId = fixtureGuid(sectorKey, "world", systemIndex * 8 + worldIndex); const world: World = { Id: worldId, WorldType: worldTypes[(systemIndex * 3 + worldIndex) % worldTypes.length], inhabitedWorld: worldIndex === 1 && systemIndex % 2 === 0, Angle: (systemIndex * 47 + worldIndex * 121) % 360, MoonOf: null, AU: planetAu[worldIndex] };
      worlds.push(world); addDetails(details, worldId, `${sectorName}-${systemIndex + 1}-${worldIndex + 1}`, systemIndex + worldIndex, "World");
      if (worldIndex === 1) { const moonId = fixtureGuid(sectorKey, "world", systemIndex * 8 + 7); worlds.push({ Id: moonId, WorldType: "Luna", inhabitedWorld: false, Angle: (systemIndex * 83 + 217) % 360, MoonOf: worldId, AU: null }); addDetails(details, moonId, `${sectorName}-${systemIndex + 1}-${worldIndex + 1}a`, systemIndex + 3, "Moon"); }
    }
    const pois: POI[] = [{ Id: fixtureGuid(sectorKey, "poi", systemIndex), POIType: "Outpost", ParentObjectId: worlds[0].Id }]; addDetails(details, pois[0].Id, `Outpost-${systemIndex + 1}`, systemIndex + 2, "POI");
    const system: StarSystem = { Id: systemId, HexLocation: hex, Star: star, Worlds: worlds, POIs: pois }; systems.push(system); addDetails(details, systemId, `${sectorName}-System-${systemIndex + 1}`, systemIndex, "System"); addDetails(details, starId, `${sectorName}-Star-${systemIndex + 1}`, systemIndex + 1, "Star");
  });
  const routes: { Id: Guid; SystemId1: Guid; SystemId2: Guid }[] = []; let routeIndex = 0;
  for (let systemIndex = 0; systemIndex < systems.length; systemIndex += 1) for (let otherIndex = systemIndex + 1; otherIndex < systems.length; otherIndex += 1) if (areAdjacentHexes(systems[systemIndex].HexLocation, systems[otherIndex].HexLocation)) { const id = fixtureGuid(sectorKey, "route", routeIndex); routes.push({ Id: id, SystemId1: systems[systemIndex].Id, SystemId2: systems[otherIndex].Id }); addDetails(details, id, `Route-${routeIndex + 1}`, routeIndex, "Route"); routeIndex += 1; }
  const playerShip: PlayerShip = { Id: fixtureGuid(sectorKey, "ship", 0), CurrentSystemId: systems[0].Id, CurrentLocationId: systems[0].Star.Id }; addDetails(details, playerShip.Id, `${sectorName}-Courier`, 2, "Player Ship");
  return { OriginalSeed: seed, SectorName: sectorName, Systems: systems, Routes: routes, PlayerShip: playerShip, DetailsAndVisibility: details };
}

export function createInitialSectors(): Sector[] { return [createMockSector("sector-1", "sector-one-seed", "Sector1"), createMockSector("sector-2", "sector-two-seed", "Sector2")]; }
export function cloneSectorTemplate(template: Sector, seed: string, index: number): Sector { return cloneSectorWithFreshIds(template, seed, index, freshGuid); }
