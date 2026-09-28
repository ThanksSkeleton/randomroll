import { isValidScanVisibility } from './visibility';
import type { Sector } from '../../../merged_schema';
import { POLITY_FLAG_COLORS } from '../../../politics';
import { containingSystem, getAllSelectableIds, routePortals } from './selectors';

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
    else if (
      !/^#[0-9a-f]{6}$/i.test(polity.Flag.FieldColor) ||
      !POLITY_FLAG_COLORS.includes(polity.Flag.CircleColor) ||
      polity.Flag.FieldColor === polity.Flag.CircleColor ||
      sector.Polities.some(
        (candidate) =>
          candidate.Id !== polity.Id && candidate.Flag.FieldColor === polity.Flag.FieldColor,
      )
    )
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
    }
    for (const poi of system.PointsOfInterest)
      if (!localIds.has(poi.ParentObjectId)) errors.push(`POI ${poi.Id} has an invalid parent.`);
  }
  const portalIds = new Set(sector.RoutePortals.map((portal) => portal.Id));
  for (const portal of sector.RoutePortals)
    if (!systemIds.has(portal.SystemId) || !portal.RouteId)
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
  if (!containingSystem(sector, sector.PlayerShip.CurrentLocationId))
    errors.push('PlayerShip.CurrentLocationId must refer to a system-contained location.');
  return errors;
}
