import type { PortraitDisplayDTO } from '../DisplayDTO/dto';
import type { Planet, Sector, Temperature } from '../BaseDTO/merged_schema';
import {
  categoryForOtherObject,
  categoryForPoi,
  categoryForStar,
  portraitAt,
  type PortraitCategory,
} from '../Data/Projection/portrait_assets';
import { displayBulkComposition } from './composition_presentation';
import { projectObjectSpatial } from './object_spatial_projection';
import { owningRoute } from './route_projection';

function planetCategory(planet: Planet, temperature: Temperature): PortraitCategory | undefined {
  if (planet.InhabitedInfo !== false) return undefined;
  const key = `${planet.Size}:${planet.BulkComposition}`;
  switch (key) {
    case 'Luna:Iron':
      return 'mercurian';
    case 'Luna:Water':
      return displayBulkComposition('Water', temperature) === 'Ice'
        ? 'europan-ice'
        : 'europan-water';
    case 'Luna:Silicon':
      return 'lunar';
    case 'Mars:Sulfur':
      return 'ioan';
    case 'Mars:Carbon':
      return 'titanian';
    case 'Mars:Silicon':
      return 'martian';
    case 'Earth:Silicon':
      return 'venusian';
    case 'Jupiter:Jovian Gas':
      return 'jovian';
    case 'Neptune:Neptunian Gas':
      return 'neptunian';
    default:
      return undefined;
  }
}

/** Resolve the canonical variant choice and entity facts into display-only asset data. */
export function projectPortrait(
  sector: Sector,
  selectedId: string,
  preview: 'gm' | 'player',
  assetBaseUrl: string,
): PortraitDisplayDTO | undefined {
  let portraitIndex: number | undefined;
  let category: PortraitCategory | undefined;
  let basicScan = false;

  const system = sector.Systems.find(
    (candidate) => candidate.Id === selectedId || candidate.Star.Id === selectedId,
  );
  if (system) {
    portraitIndex = system.Star.PortraitIndex;
    category = categoryForStar(system.Star.StarType);
    basicScan = (system.Id === selectedId ? system : system.Star).Visibility.BasicScan;
  } else {
    const containingSystem = sector.Systems.find((candidate) =>
      [...candidate.Objects, ...candidate.PointsOfInterest].some((item) => item.Id === selectedId),
    );
    const object = containingSystem?.Objects.find((candidate) => candidate.Id === selectedId);
    const poi = containingSystem?.PointsOfInterest.find((candidate) => candidate.Id === selectedId);
    if (object) {
      portraitIndex = object.PortraitIndex;
      basicScan = object.Visibility.BasicScan;
      if (object.Kind === 'Planet') {
        const temperature = projectObjectSpatial(sector, object.Id)?.temperature;
        category = temperature && planetCategory(object, temperature);
      } else category = categoryForOtherObject(object.ObjectType);
    } else if (poi) {
      portraitIndex = poi.PortraitIndex;
      category = categoryForPoi(poi.POIType);
      basicScan = poi.Visibility.BasicScan;
    } else {
      const route = sector.Routes.find((candidate) => candidate.Id === selectedId);
      const portal = sector.RoutePortals.find((candidate) => candidate.Id === selectedId);
      portraitIndex =
        route?.PortraitIndex ?? (portal && owningRoute(sector, portal.Id)?.PortraitIndex);
      category = route || portal ? 'Route' : undefined;
      basicScan = route?.Visibility.BasicScan ?? portal?.Visibility.BasicScan ?? false;
    }
  }

  if (preview === 'player' && !basicScan) return undefined;
  if (portraitIndex === undefined || category === undefined) return undefined;
  const portrait = portraitAt(category, portraitIndex);
  if (!portrait) return undefined;
  return {
    portraitIndex,
    variantId: portrait.variantId,
    category,
    url: assetBaseUrl + portrait.sourcePath,
    style: portrait.css,
  };
}
