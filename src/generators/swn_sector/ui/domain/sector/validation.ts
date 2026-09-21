import { VisibilityLevel } from './model';
import type { Sector } from './model';
import { containingSystem, getAllSelectableIds, routePortals } from './selectors';

export function validateSector(sector: Sector): string[] {
  const errors: string[] = [];
  if (!sector || !Array.isArray(sector.Systems) || !Array.isArray(sector.Routes) || !sector.PlayerShip)
    return ['Sector is missing required root collections or PlayerShip.'];
  const ids = getAllSelectableIds(sector);
  if (new Set(ids).size !== ids.length) errors.push('Selectable object IDs must be globally unique.');
  for (const entity of sector.Systems.flatMap((system) => [system, system.Star, ...system.Objects, ...system.PointsOfInterest]))
    if (!Object.values(VisibilityLevel).includes(entity.VisibilityLevel as never))
      errors.push(`Invalid visibility level for ${entity.Id}.`);
  const systemIds = new Set(sector.Systems.map((system) => system.Id));
  const objectIds = new Set(sector.Systems.flatMap((system) => system.Objects.map((object) => object.Id)));
  for (const system of sector.Systems) {
    const localIds = new Set([system.Id, system.Star.Id, ...system.Objects.map((object) => object.Id)]);
    for (const object of system.Objects)
      if (object.Orbit.ParentObjectId !== null && !objectIds.has(object.Orbit.ParentObjectId))
        errors.push(`Object ${object.Id} has an invalid parent.`);
    for (const poi of system.PointsOfInterest)
      if (!localIds.has(poi.ParentObjectId)) errors.push(`POI ${poi.Id} has an invalid parent.`);
  }
  const portalIds = new Set(sector.RoutePortals.map((portal) => portal.Id));
  for (const portal of sector.RoutePortals)
    if (!systemIds.has(portal.SystemId) || !portal.RouteId) errors.push(`Portal ${portal.Id} has invalid references.`);
  for (const route of sector.Routes) {
    if (route.PortalIds.some((id) => !portalIds.has(id))) errors.push(`Route ${route.Id} has invalid portals.`);
    else if (!routePortals(sector, route)) errors.push(`Route ${route.Id} has invalid endpoints.`);
  }
  if (!containingSystem(sector, sector.PlayerShip.CurrentLocationId))
    errors.push('PlayerShip.CurrentLocationId must refer to a system-contained location.');
  return errors;
}
