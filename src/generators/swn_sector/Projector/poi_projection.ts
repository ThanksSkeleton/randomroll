import type { Sector } from '../BaseDTO/merged_schema';
import type { PoiDisplayDTO } from '../DisplayDTO/dto';

export function projectPoi(sector: Sector, id: string): PoiDisplayDTO | undefined {
  for (const system of sector.Systems) {
    const poi = system.PointsOfInterest.find((candidate) => candidate.Id === id);
    if (!poi) continue;
    if (!system.Objects.some((object) => object.Id === poi.ParentObjectId)) return undefined;
    return {
      id: poi.Id,
      hostId: poi.ParentObjectId,
      typeLabel: poi.POIType,
      inspectorBasic: poi.POIType,
    };
  }
  return undefined;
}
