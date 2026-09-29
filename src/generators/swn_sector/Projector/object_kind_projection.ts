import type { Sector } from '../BaseDTO/merged_schema';

/** Existing inspector/editor kind labels, derived from canonical kind and parent links. */
export function projectObjectKind(sector: Sector, id: string | null): string {
  if (!id) return '';
  if (sector.PlayerShip.Id === id) return 'PLAYER SHIP';
  if (sector.Routes.some((route) => route.Id === id)) return 'ROUTE';
  if (sector.RoutePortals.some((portal) => portal.Id === id)) return 'ROUTE PORTAL';
  for (const system of sector.Systems) {
    if (system.Id === id) return 'SYSTEM';
    if (system.Star.Id === id) return 'STAR';
    const object = system.Objects.find((candidate) => candidate.Id === id);
    if (object) {
      if (object.Kind === 'Planet') return object.Orbit.ParentObjectId ? 'MOON' : 'WORLD';
      return 'OTHERCELESTIALOBJECT';
    }
    if (system.PointsOfInterest.some((poi) => poi.Id === id)) return 'POINT OF INTEREST';
    const hpoi = system.HabitablePointsOfInterest.find((poi) => poi.Id === id);
    if (hpoi) return hpoi.HPOIType.toUpperCase();
  }
  return '';
}

export function projectOtherObjectTypeLabel(objectType: string): string {
  return objectType.replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function projectOtherObjectGlyphClass(objectType: string): string {
  return `other-object-${objectType.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`;
}
