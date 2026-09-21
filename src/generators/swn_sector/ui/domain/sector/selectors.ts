import { VisibilityLevel } from './visibility';
import type {
  Guid,
  HexLocation,
  OtherCelestialObject,
  Planet,
  PointOfInterest,
  PlayerShip,
  Route,
  RoutePortal,
  Sector,
  Star,
  StarSystem,
  SystemObject,
} from '../../../merged_schema';

export type FoundObject =
  | { object: StarSystem; kind: 'System'; containingSystem?: StarSystem }
  | { object: Star; kind: 'Star'; containingSystem?: StarSystem }
  | { object: Planet; kind: 'Planet'; containingSystem?: StarSystem }
  | { object: OtherCelestialObject; kind: 'OtherCelestialObject'; containingSystem?: StarSystem }
  | { object: PointOfInterest; kind: 'PointOfInterest'; containingSystem?: StarSystem }
  | { object: RoutePortal; kind: 'RoutePortal'; containingSystem?: StarSystem }
  | { object: Route; kind: 'Route'; containingSystem?: StarSystem }
  | { object: PlayerShip; kind: 'PlayerShip'; containingSystem?: StarSystem };

export function areAdjacentHexes(a: HexLocation, b: HexLocation): boolean {
  const dx = Math.abs(a.Column - b.Column);
  const dy = b.Row - a.Row;
  if (dx === 0) return Math.abs(dy) === 1;
  if (dx !== 1) return false;
  const leftColumn = a.Column < b.Column ? a.Column : b.Column;
  const rowDelta = a.Column < b.Column ? dy : -dy;
  return leftColumn % 2 === 1
    ? rowDelta === 0 || rowDelta === -1
    : rowDelta === 0 || rowDelta === 1;
}

export function systemObjects(system: StarSystem): SystemObject[] {
  return system.Objects;
}
export function planets(system: StarSystem): Planet[] {
  return system.Objects.filter((object): object is Planet => object.Kind === 'Planet');
}
export function moons(system: StarSystem): Planet[] {
  return planets(system).filter((planet) => planet.Orbit.ParentObjectId !== null);
}
export function objectParentId(object: SystemObject): Guid | null {
  return object.Orbit.ParentObjectId;
}

export function routePortals(sector: Sector, route: Route): [RoutePortal, RoutePortal] | undefined {
  const portals = route.PortalIds.map((id) =>
    sector.RoutePortals.find((portal) => portal.Id === id),
  );
  return portals[0] && portals[1] ? [portals[0], portals[1]] : undefined;
}

export function routeSystems(sector: Sector, route: Route): [StarSystem, StarSystem] | undefined {
  const portals = routePortals(sector, route);
  if (!portals) return undefined;
  const systems = portals.map(({ SystemId }) => sector.Systems.find((system) => system.Id === SystemId));
  return systems[0] && systems[1] ? [systems[0], systems[1]] : undefined;
}

export function getAllSelectableIds(sector: Sector): Guid[] {
  return objectEntries(sector).map(({ object }) => object.Id);
}

export function objectEntries(sector: Sector): FoundObject[] {
  const entries: FoundObject[] = [];
  for (const system of sector.Systems) {
    entries.push({ object: system, kind: 'System', containingSystem: system });
    entries.push({ object: system.Star, kind: 'Star', containingSystem: system });
    for (const object of system.Objects) {
      if (object.Kind === 'Planet') entries.push({ object, kind: 'Planet', containingSystem: system });
      else entries.push({ object, kind: 'OtherCelestialObject', containingSystem: system });
    }
    for (const poi of system.PointsOfInterest)
      entries.push({ object: poi, kind: 'PointOfInterest', containingSystem: system });
  }
  for (const portal of sector.RoutePortals) {
    entries.push({
      object: portal,
      kind: 'RoutePortal',
      containingSystem: sector.Systems.find((system) => system.Id === portal.SystemId),
    });
  }
  for (const route of sector.Routes) entries.push({ object: route, kind: 'Route' });
  entries.push({
    object: sector.PlayerShip,
    kind: 'PlayerShip',
    containingSystem: containingSystem(sector, sector.PlayerShip.CurrentLocationId),
  });
  return entries;
}

export function findObject(sector: Sector, id: Guid): FoundObject | undefined {
  return objectEntries(sector).find((entry) => entry.object.Id === id);
}
export function containingSystem(sector: Sector, id: Guid): StarSystem | undefined {
  for (const system of sector.Systems) {
    if (
      system.Id === id ||
      system.Star.Id === id ||
      system.Objects.some((object) => object.Id === id) ||
      system.PointsOfInterest.some((poi) => poi.Id === id)
    )
      return system;
  }
  return sector.RoutePortals.find((portal) => portal.Id === id)
    ? sector.Systems.find(
        (system) => system.Id === sector.RoutePortals.find((portal) => portal.Id === id)!.SystemId,
      )
    : undefined;
}
export function findContainingSystem(sector: Sector, id: Guid): StarSystem | undefined {
  return findObject(sector, id)?.containingSystem;
}
export function objectDetails(sector: Sector, id: Guid) {
  return findObject(sector, id)?.object;
}
export const findDetails = objectDetails;
export function isVisibleToPlayer(sector: Sector, id: Guid): boolean {
  return (objectDetails(sector, id)?.VisibilityLevel ?? VisibilityLevel.NONE) !== VisibilityLevel.NONE;
}
export function objectKindLabel(sector: Sector, id: Guid | null): string {
  if (!id) return '';
  const found = findObject(sector, id);
  if (!found) return '';
  if (found.kind === 'PlayerShip') return 'PLAYER SHIP';
  if (found.kind === 'PointOfInterest') return 'POINT OF INTEREST';
  if (found.kind === 'RoutePortal') return 'ROUTE PORTAL';
  if (found.kind === 'Planet') return (found.object as Planet).Orbit.ParentObjectId ? 'MOON' : 'WORLD';
  return found.kind.toUpperCase();
}
export function resolveTravelDestination(sector: Sector, routeId: Guid, contextSystemId: Guid) {
  const route = sector.Routes.find((candidate) => candidate.Id === routeId);
  const systems = route && routeSystems(sector, route);
  if (!systems) return undefined;
  return systems.find((system) => system.Id !== contextSystemId);
}
