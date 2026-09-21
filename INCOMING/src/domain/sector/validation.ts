import { Sector, VisibilityLevel } from './model';
import { findContainingSystem, getAllSelectableIds } from './selectors';

export function validateSector(sector: Sector): string[] {
  const errors: string[] = [];
  if (
    !sector ||
    !Array.isArray(sector.Systems) ||
    !Array.isArray(sector.Routes) ||
    !sector.PlayerShip
  )
    return ['Sector is missing required root collections or PlayerShip.'];
  const ids = getAllSelectableIds(sector);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) errors.push('Selectable object IDs must be globally unique.');
  const detailIds = sector.DetailsAndVisibility.map((detail) => detail.Id);
  if (new Set(detailIds).size !== detailIds.length)
    errors.push('DetailsAndVisibility IDs must be unique.');
  if (
    detailIds.length !== ids.length ||
    detailIds.some((id) => !uniqueIds.has(id)) ||
    ids.some((id) => !detailIds.includes(id))
  )
    errors.push(
      'There must be exactly one DetailsAndVisibility record for every selectable object.',
    );
  for (const detail of sector.DetailsAndVisibility)
    if (!Object.values(VisibilityLevel).includes(detail.VisibilityLevel))
      errors.push(`Invalid visibility level for ${detail.Id}.`);
  const systemIds = new Set(sector.Systems.map((system) => system.Id));
  for (const system of sector.Systems) {
    const worldIds = new Set(system.Worlds.map((world) => world.Id));
    for (const world of system.Worlds) {
      if (world.MoonOf === null && (world.AU === null || world.AU <= 0))
        errors.push(`Planet ${world.Id} must have positive AU.`);
      if (world.MoonOf !== null && (world.AU !== null || !worldIds.has(world.MoonOf)))
        errors.push(`Moon ${world.Id} has an invalid parent or AU.`);
    }
    const parentIds = new Set([system.Id, system.Star.Id, ...worldIds]);
    for (const poi of system.POIs)
      if (!parentIds.has(poi.ParentObjectId)) errors.push(`POI ${poi.Id} has an invalid parent.`);
  }
  for (const route of sector.Routes)
    if (
      !systemIds.has(route.SystemId1) ||
      !systemIds.has(route.SystemId2) ||
      route.SystemId1 === route.SystemId2
    )
      errors.push(`Route ${route.Id} has invalid endpoints.`);
  const currentSystem = sector.Systems.find(
    (system) => system.Id === sector.PlayerShip.CurrentSystemId,
  );
  if (!currentSystem) errors.push('PlayerShip.CurrentSystemId must refer to a system.');
  else if (
    findContainingSystem(sector, sector.PlayerShip.CurrentLocationId)?.Id !== currentSystem.Id
  )
    errors.push('PlayerShip.CurrentLocationId must refer to an object in CurrentSystemId.');
  return errors;
}
