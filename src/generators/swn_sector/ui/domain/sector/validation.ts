import { isValidScanVisibility } from './visibility';
import type { Sector } from '../../../merged_schema';
import { containingSystem, getAllSelectableIds, routePortals } from './selectors';

export function validateSector(sector: Sector): string[] {
  const errors: string[] = [];
  if (!sector || !Array.isArray(sector.Systems) || !Array.isArray(sector.Routes) || !sector.PlayerShip)
    return ['Sector is missing required root collections or PlayerShip.'];
  if (!['UNRESTRICTED', 'TL4_PLUS', 'TL4_PLUS_POP_GT_500'].includes(sector.StartingWorldMode))
    errors.push('Sector.StartingWorldMode is invalid.');
  if (sector.StartingWorldId !== null && !sector.Systems.some((system) =>
    system.Objects.some((object) => object.Id === sector.StartingWorldId && object.Kind === 'Planet' && object.InhabitedInfo !== false),
  )) errors.push('Sector.StartingWorldId must refer to an inhabited planet in the sector or be null.');
  const ids = getAllSelectableIds(sector);
  if (new Set(ids).size !== ids.length) errors.push('Selectable object IDs must be globally unique.');
  for (const entity of sector.Systems.flatMap((system) => [system, system.Star, ...system.Objects, ...system.PointsOfInterest]))
    if (!isValidScanVisibility(entity.Visibility))
      errors.push(`Invalid scan visibility for ${entity.Id}.`);
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
