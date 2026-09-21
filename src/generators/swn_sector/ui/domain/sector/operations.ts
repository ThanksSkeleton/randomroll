import { VisibilityLevel } from './model';
import type { Guid, Sector } from './model';
import { findContainingSystem, findObject, getAllSelectableIds } from './selectors';

export type SectorOperationFailure =
  'object-not-found' | 'invalid-visibility' | 'deletion-prohibited' | 'move-prohibited';

export type SectorOperationResult<T> =
  { ok: true; value: T } | { ok: false; reason: SectorOperationFailure };
const success = <T>(value: T): SectorOperationResult<T> => ({ ok: true, value });
const failure = <T>(reason: SectorOperationFailure): SectorOperationResult<T> => ({
  ok: false,
  reason,
});
const copySector = (sector: Sector): Sector => structuredClone(sector);

export function updateObjectVisibility(
  sector: Sector,
  id: Guid,
  level: VisibilityLevel,
): SectorOperationResult<Sector> {
  if (!Object.values(VisibilityLevel).includes(level)) return failure('invalid-visibility');
  if (!findObject(sector, id)) return failure('object-not-found');
  const next = copySector(sector);
  const detail = next.DetailsAndVisibility.find((record) => record.Id === id);
  if (!detail) return failure('object-not-found');
  detail.VisibilityLevel = level;
  return success(next);
}

export function relocatePlayerShip(sector: Sector, targetId: Guid): SectorOperationResult<Sector> {
  const target = findObject(sector, targetId);
  if (!target || !target.containingSystem || !['System', 'World'].includes(target.kind))
    return failure('move-prohibited');
  const next = copySector(sector);
  const system = findContainingSystem(next, targetId);
  if (!system) return failure('move-prohibited');
  next.PlayerShip.CurrentSystemId = system.Id;
  next.PlayerShip.CurrentLocationId = target.kind === 'System' ? system.Star.Id : targetId;
  return success(next);
}

export function deleteSectorObject(sector: Sector, id: Guid): SectorOperationResult<Sector> {
  const found = findObject(sector, id);
  if (!found || found.kind === 'PlayerShip' || found.kind === 'Star')
    return failure('deletion-prohibited');
  const next = copySector(sector);
  const removedIds = new Set<Guid>([id]);

  if (found.kind === 'System') {
    if (next.Systems.length <= 1 || next.PlayerShip.CurrentSystemId === id)
      return failure('deletion-prohibited');
    const system = next.Systems.find((candidate) => candidate.Id === id)!;
    removedIds.add(system.Star.Id);
    for (const world of system.Worlds) removedIds.add(world.Id);
    for (const poi of system.POIs) removedIds.add(poi.Id);
    next.Systems = next.Systems.filter((candidate) => candidate.Id !== id);
    next.Routes = next.Routes.filter((route) => {
      const keep = route.SystemId1 !== id && route.SystemId2 !== id;
      if (!keep) removedIds.add(route.Id);
      return keep;
    });
  } else if (found.kind === 'World') {
    const system = findContainingSystem(next, id);
    if (!system) return failure('deletion-prohibited');
    const worldAndMoons = new Set([
      id,
      ...system.Worlds.filter((candidate) => candidate.MoonOf === id).map(
        (candidate) => candidate.Id,
      ),
    ]);
    if (worldAndMoons.has(next.PlayerShip.CurrentLocationId)) return failure('deletion-prohibited');
    for (const world of system.Worlds)
      if (world.Id === id || world.MoonOf === id) removedIds.add(world.Id);
    for (const poi of system.POIs) if (removedIds.has(poi.ParentObjectId)) removedIds.add(poi.Id);
    system.Worlds = system.Worlds.filter((candidate) => !removedIds.has(candidate.Id));
    system.POIs = system.POIs.filter((poi) => !removedIds.has(poi.Id));
  } else if (found.kind === 'POI') {
    const system = findContainingSystem(next, id);
    if (!system) return failure('deletion-prohibited');
    system.POIs = system.POIs.filter((poi) => poi.Id !== id);
  } else if (found.kind === 'Route') {
    next.Routes = next.Routes.filter((route) => route.Id !== id);
  }

  next.DetailsAndVisibility = next.DetailsAndVisibility.filter(
    (detail) => !removedIds.has(detail.Id),
  );
  return success(next);
}

export type EditableDetailField =
  | 'NiceName'
  | 'Details_Basic_Scan'
  | 'Details_Culture_Partial'
  | 'Details_Culture_Full'
  | 'Details_GM';
export interface SectorEdits {
  sectorName: string;
  details: Record<Guid, Partial<Record<EditableDetailField, string>>>;
}

export function applySectorEdits(sector: Sector, edits: SectorEdits): Sector {
  const next = copySector(sector);
  next.SectorName = edits.sectorName;
  for (const [id, fields] of Object.entries(edits.details)) {
    const detail = next.DetailsAndVisibility.find((candidate) => candidate.Id === id);
    if (!detail) continue;
    for (const [field, value] of Object.entries(fields) as [EditableDetailField, string][]) {
      if (field === 'NiceName') detail.NiceName = value;
      else detail[field].Text = value;
    }
  }
  return next;
}

export function cloneSectorWithFreshIds(
  sector: Sector,
  seed: string,
  index: number,
  createId: () => Guid,
): Sector {
  const next = copySector(sector);
  const idMap = new Map<Guid, Guid>();
  for (const id of getAllSelectableIds(next)) idMap.set(id, createId());
  const remap = (id: Guid): Guid => idMap.get(id) ?? id;
  next.SectorName = `Generated-${index}-${seed || 'sector'}`;
  next.OriginalSeed = seed;
  for (const system of next.Systems) {
    system.Id = remap(system.Id);
    system.Star.Id = remap(system.Star.Id);
    for (const world of system.Worlds) {
      const moonOf = world.MoonOf;
      world.Id = remap(world.Id);
      world.MoonOf = moonOf === null ? null : remap(moonOf);
    }
    for (const poi of system.POIs) {
      poi.Id = remap(poi.Id);
      poi.ParentObjectId = remap(poi.ParentObjectId);
    }
  }
  for (const route of next.Routes) {
    route.Id = remap(route.Id);
    route.SystemId1 = remap(route.SystemId1);
    route.SystemId2 = remap(route.SystemId2);
  }
  next.PlayerShip.Id = remap(next.PlayerShip.Id);
  next.PlayerShip.CurrentSystemId = remap(next.PlayerShip.CurrentSystemId);
  next.PlayerShip.CurrentLocationId = remap(next.PlayerShip.CurrentLocationId);
  for (const detail of next.DetailsAndVisibility) detail.Id = remap(detail.Id);
  return next;
}
