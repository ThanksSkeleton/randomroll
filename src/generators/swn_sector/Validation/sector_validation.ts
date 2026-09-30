import { isValidScanVisibility } from '../Helpers/Domain/scan_visibility';
import type { Sector } from '../BaseDTO/merged_schema';
import { validPolityFlag } from './politics';
import {
  containingSystem,
  getAllSelectableIds,
  routePortals,
} from '../Helpers/Domain/sector_selectors';

export function validateSector(sector: Sector): string[] {
  const errors: string[] = [];
  if (
    !sector ||
    !Array.isArray(sector.Systems) ||
    !Array.isArray(sector.Routes) ||
    !Array.isArray(sector.Polities) ||
    !Array.isArray(sector.ConquestEvents) ||
    !sector.PlayerShip
  )
    return ['Sector is missing required root collections or PlayerShip.'];
  if (!['UNRESTRICTED', 'TL4_PLUS', 'TL4_PLUS_POP_GT_500'].includes(sector.StartingWorldMode))
    errors.push('Sector.StartingWorldMode is invalid.');
  if (
    sector.StartingWorldId !== null &&
    !sector.Systems.some((system) =>
      system.Objects.some(
        (object) =>
          object.Id === sector.StartingWorldId &&
          object.Kind === 'Planet' &&
          object.InhabitedInfo !== false,
      ),
    )
  )
    errors.push(
      'Sector.StartingWorldId must refer to an inhabited planet in the sector or be null.',
    );
  const ids = getAllSelectableIds(sector);
  if (new Set(ids).size !== ids.length)
    errors.push('Selectable object IDs must be globally unique.');
  for (const entity of sector.Systems.flatMap((system) => [
    system,
    system.Star,
    ...system.Objects,
    ...system.PointsOfInterest,
    ...system.HabitablePointsOfInterest,
  ]))
    if (!isValidScanVisibility(entity.Visibility))
      errors.push(`Invalid scan visibility for ${entity.Id}.`);
  const systemIds = new Set(sector.Systems.map((system) => system.Id));
  const objectIds = new Set(
    sector.Systems.flatMap((system) => system.Objects.map((object) => object.Id)),
  );
  const inhabitedIds = new Set(
    sector.Systems.flatMap((system) =>
      system.Objects.filter(
        (object) => object.Kind === 'Planet' && object.InhabitedInfo !== false,
      ).map((object) => object.Id),
    ),
  );
  const polityIds = new Set(sector.Polities.map((polity) => polity.Id));
  if (polityIds.size !== sector.Polities.length) errors.push('Polity IDs must be unique.');
  if (sector.Polities.length !== inhabitedIds.size)
    errors.push('Every inhabited world must have exactly one polity.');
  for (const polity of sector.Polities)
    if (!inhabitedIds.has(polity.HomeworldId))
      errors.push(`Polity ${polity.Id} has an invalid homeworld.`);
    else if (!validPolityFlag(polity, sector.Polities))
      errors.push(`Polity ${polity.Id} has invalid flag colors.`);
  for (const system of sector.Systems) {
    const localIds = new Set([
      system.Id,
      system.Star.Id,
      ...system.Objects.map((object) => object.Id),
    ]);
    for (const object of system.Objects) {
      if (object.Orbit.ParentObjectId !== null && !objectIds.has(object.Orbit.ParentObjectId))
        errors.push(`Object ${object.Id} has an invalid parent.`);
      if (object.ClaimedByPolityIds.some((id) => !polityIds.has(id)))
        errors.push(`Object ${object.Id} has an invalid political claim.`);
      if (
        object.Kind === 'Planet' &&
        ((object.InhabitedInfo === false && object.Culture !== undefined) ||
          (object.InhabitedInfo !== false && object.Culture === undefined))
      )
        errors.push(`World ${object.Id} has invalid culture state.`);
    }
    for (const poi of system.PointsOfInterest)
      if (!localIds.has(poi.ParentObjectId)) errors.push(`POI ${poi.Id} has an invalid parent.`);
    for (const hpoi of system.HabitablePointsOfInterest) {
      if (
        !inhabitedIds.has(hpoi.ParentWorldId) ||
        !system.Objects.some((object) => object.Id === hpoi.ParentWorldId)
      )
        errors.push(`HPOI ${hpoi.Id} has an invalid parent.`);
      if (hpoi.HPOIType === 'Garrison' && !polityIds.has(hpoi.AssignedPolityId ?? ''))
        errors.push(`Garrison ${hpoi.Id} has an invalid polity.`);
    }
  }
  const portalIds = new Set(sector.RoutePortals.map((portal) => portal.Id));
  for (const portal of sector.RoutePortals)
    if (
      !systemIds.has(portal.SystemId) ||
      sector.Routes.filter((route) => route.PortalIds.includes(portal.Id)).length !== 1
    )
      errors.push(`Portal ${portal.Id} has invalid references.`);
  for (const route of sector.Routes) {
    if (route.PortalIds.some((id) => !portalIds.has(id)))
      errors.push(`Route ${route.Id} has invalid portals.`);
    else if (!routePortals(sector, route)) errors.push(`Route ${route.Id} has invalid endpoints.`);
  }
  for (const event of sector.ConquestEvents)
    if (
      !polityIds.has(event.AttackerPolityId) ||
      !polityIds.has(event.DefenderPolityId) ||
      !inhabitedIds.has(event.TargetWorldId)
    )
      errors.push(`Conquest event ${event.Id} has invalid references.`);
    else if (
      !Number.isInteger(event.Attack) ||
      event.Attack < 0 ||
      !Number.isInteger(event.Defense) ||
      event.Defense < 0 ||
      !Number.isInteger(event.RouteDistance) ||
      event.RouteDistance < 0
    )
      errors.push(`Conquest event ${event.Id} has invalid historical snapshots.`);
  if (!containingSystem(sector, sector.PlayerShip.CurrentLocationId))
    errors.push('PlayerShip.CurrentLocationId must refer to a system-contained location.');
  return errors;
}
