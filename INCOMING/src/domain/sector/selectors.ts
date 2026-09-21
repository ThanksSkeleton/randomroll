import {
  DetailsAndVisibility,
  FoundObject,
  Guid,
  HexLocation,
  Sector,
  StarSystem,
  VisibilityLevel,
  visibilityRank,
  World,
} from './model';

export function areAdjacentHexes(a: HexLocation, b: HexLocation): boolean {
  const dx = Math.abs(a.X - b.X);
  const dy = b.Y - a.Y;
  if (dx === 0) return Math.abs(dy) === 1;
  if (dx !== 1) return false;
  const leftColumn = a.X < b.X ? a.X : b.X;
  const rowDelta = a.X < b.X ? dy : -dy;
  return leftColumn % 2 === 1
    ? rowDelta === 0 || rowDelta === -1
    : rowDelta === 0 || rowDelta === 1;
}

export function getAllSelectableIds(sector: Sector): Guid[] {
  const ids: Guid[] = [];
  for (const system of sector.Systems) {
    ids.push(
      system.Id,
      system.Star.Id,
      ...system.Worlds.map((world) => world.Id),
      ...system.POIs.map((poi) => poi.Id),
    );
  }
  return [...ids, ...sector.Routes.map((route) => route.Id), sector.PlayerShip.Id];
}

export function objectEntries(sector: Sector): FoundObject[] {
  const entries: FoundObject[] = [];
  for (const system of sector.Systems) {
    entries.push(
      { object: system, kind: 'System', containingSystem: system },
      { object: system.Star, kind: 'Star', containingSystem: system },
    );
    for (const world of system.Worlds)
      entries.push({ object: world, kind: 'World', containingSystem: system });
    for (const poi of system.POIs)
      entries.push({ object: poi, kind: 'POI', containingSystem: system });
  }
  for (const route of sector.Routes) entries.push({ object: route, kind: 'Route' });
  entries.push({
    object: sector.PlayerShip,
    kind: 'PlayerShip',
    containingSystem: sector.Systems.find(
      (system) => system.Id === sector.PlayerShip.CurrentSystemId,
    ),
  });
  return entries;
}

export function findObject(sector: Sector, id: Guid): FoundObject | undefined {
  return objectEntries(sector).find((entry) => entry.object.Id === id);
}
export function findContainingSystem(sector: Sector, id: Guid): StarSystem | undefined {
  return findObject(sector, id)?.containingSystem;
}
export function findDetails(sector: Sector, id: Guid): DetailsAndVisibility | undefined {
  return sector.DetailsAndVisibility.find((detail) => detail.Id === id);
}

export function objectKindLabel(sector: Sector, id: Guid | null): string {
  if (!id) return '';
  const found = findObject(sector, id);
  if (!found) return '';
  if (found.kind === 'PlayerShip') return 'PLAYER SHIP';
  if (found.kind === 'POI') return 'POINT OF INTEREST';
  if (found.kind === 'World') return (found.object as World).MoonOf ? 'MOON' : 'WORLD';
  return found.kind.toUpperCase();
}

export function isVisibleToPlayer(sector: Sector, id: Guid): boolean {
  return visibilityRank(findDetails(sector, id)?.VisibilityLevel ?? VisibilityLevel.NONE) > 0;
}

export function resolveTravelDestination(
  sector: Sector,
  routeId: Guid,
  contextSystemId: Guid,
): StarSystem | undefined {
  const route = sector.Routes.find((candidate) => candidate.Id === routeId);
  if (!route) return undefined;
  const destinationId =
    route.SystemId1 === contextSystemId
      ? route.SystemId2
      : route.SystemId2 === contextSystemId
        ? route.SystemId1
        : undefined;
  return destinationId ? sector.Systems.find((system) => system.Id === destinationId) : undefined;
}
