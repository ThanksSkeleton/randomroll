import { VisibilityLevel } from './visibility';
import type { Guid, Sector } from '../../../merged_schema';
import { containingSystem, findObject, getAllSelectableIds, routePortals } from './selectors';

export type SectorOperationFailure =
  | 'object-not-found'
  | 'invalid-visibility'
  | 'deletion-prohibited'
  | 'move-prohibited';
export type SectorOperationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: SectorOperationFailure };
const success = <T>(value: T): SectorOperationResult<T> => ({ ok: true, value });
const failure = <T>(reason: SectorOperationFailure): SectorOperationResult<T> => ({ ok: false, reason });
const copySector = (sector: Sector): Sector => structuredClone(sector);

export function updateObjectVisibility(
  sector: Sector,
  id: Guid,
  level: (typeof VisibilityLevel)[keyof typeof VisibilityLevel],
): SectorOperationResult<Sector> {
  if (!Object.values(VisibilityLevel).includes(level)) return failure('invalid-visibility');
  const found = findObject(sector, id);
  if (!found) return failure('object-not-found');
  const next = copySector(sector);
  const updated = findObject(next, id);
  if (!updated) return failure('object-not-found');
  updated.object.VisibilityLevel = level;
  return success(next);
}

export function relocatePlayerShip(sector: Sector, targetId: Guid): SectorOperationResult<Sector> {
  const target = findObject(sector, targetId);
  const system = target?.containingSystem;
  if (!target || !system || !['System', 'Planet'].includes(target.kind))
    return failure('move-prohibited');
  const next = copySector(sector);
  next.PlayerShip.CurrentLocationId = target.kind === 'System' ? system.Star.Id : targetId;
  return success(next);
}

export function deleteSectorObject(sector: Sector, id: Guid): SectorOperationResult<Sector> {
  const found = findObject(sector, id);
  if (!found || found.kind === 'PlayerShip' || found.kind === 'Star')
    return failure('deletion-prohibited');
  const next = copySector(sector);
  const removed = new Set<Guid>([id]);
  const systemId = found.containingSystem?.Id;
  const system = systemId ? next.Systems.find((candidate) => candidate.Id === systemId) : undefined;
  if (found.kind === 'System') {
    if (next.Systems.length <= 1 || containingSystem(next, next.PlayerShip.CurrentLocationId)?.Id === id)
      return failure('deletion-prohibited');
    const source = next.Systems.find((candidate) => candidate.Id === id)!;
    for (const object of source.Objects) removed.add(object.Id);
    for (const poi of source.PointsOfInterest) removed.add(poi.Id);
    for (const portal of next.RoutePortals) if (portal.SystemId === id) removed.add(portal.Id);
    for (const route of next.Routes) {
      const portals = routePortals(next, route);
      if (portals?.some((portal) => removed.has(portal.Id))) removed.add(route.Id);
    }
    next.Systems = next.Systems.filter((candidate) => candidate.Id !== id);
    next.RoutePortals = next.RoutePortals.filter((portal) => !removed.has(portal.Id));
    next.Routes = next.Routes.filter((route) => !removed.has(route.Id));
  } else if (found.kind === 'Planet' || found.kind === 'OtherCelestialObject') {
    if (!system) return failure('deletion-prohibited');
    const childIds = system.Objects
      .filter((object) => object.Orbit.ParentObjectId === id)
      .map((object) => object.Id);
    childIds.forEach((childId) => removed.add(childId));
    for (const poi of system.PointsOfInterest) if (removed.has(poi.ParentObjectId)) removed.add(poi.Id);
    system.Objects = system.Objects.filter((object) => !removed.has(object.Id));
    system.PointsOfInterest = system.PointsOfInterest.filter((poi) => !removed.has(poi.Id));
  } else if (found.kind === 'PointOfInterest') {
    if (!system) return failure('deletion-prohibited');
    system.PointsOfInterest = system.PointsOfInterest.filter((poi) => poi.Id !== id);
  } else if (found.kind === 'RoutePortal') {
    next.RoutePortals = next.RoutePortals.filter((portal) => portal.Id !== id);
    next.Routes = next.Routes.filter((route) => !route.PortalIds.includes(id));
  } else if (found.kind === 'Route') {
    const route = next.Routes.find((candidate) => candidate.Id === id);
    next.Routes = next.Routes.filter((route) => route.Id !== id);
    next.RoutePortals = next.RoutePortals.filter((portal) => !route?.PortalIds.includes(portal.Id));
  }
  next.PlayerShip.CurrentLocationId = next.PlayerShip.CurrentLocationId;
  return success(next);
}

export type EditableDetailField =
  | 'NiceName'
  | 'InfoboxSummary'
  | 'BasicScan'
  | 'CulturePartial'
  | 'CultureFull'
  | 'GM';
export interface SectorEdits {
  sectorName: string;
  details: Record<Guid, Partial<Record<EditableDetailField, string>>>;
}
export function applySectorEdits(sector: Sector, edits: SectorEdits): Sector {
  const next = copySector(sector);
  next.SectorName = edits.sectorName;
  for (const [id, fields] of Object.entries(edits.details)) {
    const entity = findObject(next, id)?.object;
    if (!entity) continue;
    for (const [field, value] of Object.entries(fields) as [EditableDetailField, string][]) {
      if (field === 'NiceName') entity.NiceName = value;
      else entity.Intelligence[field] = value;
    }
  }
  return next;
}

export function cloneSectorWithFreshIds(sector: Sector, seed: string, index: number, createId: () => Guid): Sector {
  const next = copySector(sector);
  const idMap = new Map<Guid, Guid>();
  for (const id of getAllSelectableIds(next)) idMap.set(id, createId());
  const remap = (id: Guid): Guid => idMap.get(id) ?? id;
  next.SectorName = `Generated-${index}-${seed || 'sector'}`;
  next.OriginalSeed = seed;
  for (const system of next.Systems) {
    system.Id = remap(system.Id);
    system.Star.Id = remap(system.Star.Id);
    for (const object of system.Objects) {
      const parent = object.Orbit.ParentObjectId;
      object.Id = remap(object.Id);
      object.Orbit.ParentObjectId = parent === null ? null : remap(parent);
    }
    for (const poi of system.PointsOfInterest) {
      poi.Id = remap(poi.Id);
      poi.ParentObjectId = remap(poi.ParentObjectId);
    }
  }
  for (const portal of next.RoutePortals) {
    portal.Id = remap(portal.Id);
    portal.RouteId = remap(portal.RouteId);
    portal.SystemId = remap(portal.SystemId);
  }
  for (const route of next.Routes) {
    route.Id = remap(route.Id);
    route.PortalIds = [remap(route.PortalIds[0]), remap(route.PortalIds[1])];
  }
  next.PlayerShip.Id = remap(next.PlayerShip.Id);
  next.PlayerShip.CurrentLocationId = remap(next.PlayerShip.CurrentLocationId);
  return next;
}
