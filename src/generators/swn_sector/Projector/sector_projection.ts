import type { Sector, SelectableEntity, SelectableObjectKind } from '../BaseDTO/merged_schema';
import type {
  ArchiveSectorDisplayDTO,
  DisplaySectorDTO,
  DisplaySelectableDTO,
  DisplaySystemDTO,
  PlanetStockText,
} from '../DisplayDTO/dto';
import { projectCultureScreen, projectHabitablePoi } from './culture_projection';
import { projectObjectKind } from './object_kind_projection';
import { projectObjectSpatial } from './object_spatial_projection';
import { projectPlanet } from './planet_projection';
import { projectPoi } from './poi_projection';
import { projectClaims, projectConquest, projectPolity } from './politics_projection';
import { projectPortrait } from './portrait_projection';
import { projectRoute } from './route_projection';
import { projectStar } from './star_projection';
import { projectSystemSpatial } from './system_spatial_projection';

export type SectorProjectionResult =
  { ok: true; value: DisplaySectorDTO } | { ok: false; reason: 'invalid-reference'; path: string };

export function projectArchiveSector(sector: Sector, index: number): ArchiveSectorDisplayDTO {
  const startingWorld = sector.Systems.flatMap((system) => system.Objects).find(
    (object) => object.Id === sector.StartingWorldId,
  );
  return {
    index,
    name: sector.SectorName,
    originalSeed: sector.OriginalSeed,
    startingWorldMode: sector.StartingWorldMode,
    startingWorldId: sector.StartingWorldId,
    startingWorldName: startingWorld?.NiceName ?? null,
  };
}

/** Assemble existing projections into a detached read graph. No generator is called here. */
export function projectSector(
  sector: Sector,
  options: { preview: 'gm' | 'player'; assetBaseUrl: string },
): SectorProjectionResult {
  const entities: Record<string, DisplaySelectableDTO> = Object.create(null);
  const systems: DisplaySystemDTO[] = [];
  const fail = (path: string): SectorProjectionResult => ({
    ok: false,
    reason: 'invalid-reference',
    path,
  });
  const emptyStock = (): PlanetStockText => ({
    basic: '-',
    detailed: '-',
    politics: '-',
    deep: '-',
    gm: '-',
  });
  const add = (
    source: SelectableEntity,
    kind: SelectableObjectKind,
    containingSystemId: string | null,
    extra: Partial<DisplaySelectableDTO> = {},
  ): boolean => {
    if (entities[source.Id]) return false;
    entities[source.Id] = {
      id: source.Id,
      kind,
      kindLabel: projectObjectKind(sector, source.Id),
      containingSystemId,
      proceduralName: source.ProceduralName,
      niceName: source.NiceName,
      visibility: { ...source.Visibility },
      intelligence: { ...source.Intelligence },
      portrait: projectPortrait(sector, source.Id, options.preview, options.assetBaseUrl) ?? null,
      portraitDescription: kind,
      inspectorStock: emptyStock(),
      ...extra,
    };
    return true;
  };

  for (const system of sector.Systems) {
    const spatial = projectSystemSpatial(sector, system.Id);
    const star = projectStar(sector, system.Id);
    const claims = projectClaims(sector, system);
    if (!spatial || !star || !claims) return fail(`Systems.${system.Id}`);
    if (
      !add(system, 'System', system.Id, {
        systemSpatial: spatial,
        star,
        inspectorBasicScan: star.basicScan,
        claims,
        inspectorClaimants: claims.claimants,
        portraitDescription: `${star.starType} star`,
        inspectorStock: {
          ...emptyStock(),
          basic: spatial.inspectorBasic,
          politics: claims.stockText,
        },
      })
    )
      return fail(`Systems.${system.Id}.Id`);
    if (!add(system.Star, 'Star', system.Id, { star, inspectorBasicScan: star.basicScan }))
      return fail(`Systems.${system.Id}.Star.Id`);
    for (const object of system.Objects) {
      const objectSpatial = projectObjectSpatial(sector, object.Id);
      const objectClaims = projectClaims(sector, object);
      const planet =
        object.Kind === 'Planet'
          ? projectPlanet(sector, object.Id, { preview: options.preview })
          : undefined;
      if (!objectSpatial || !objectClaims || (object.Kind === 'Planet' && !planet))
        return fail(`Systems.${system.Id}.Objects.${object.Id}`);
      if (
        !add(object, object.Kind, system.Id, {
          spatial: objectSpatial,
          claims: objectClaims,
          ...(planet ? { planet } : {}),
          ...(planet ? { inspectorBasicScan: planet.basicScan } : {}),
          inspectorClaimants: objectClaims.claimants,
          portraitDescription:
            object.Kind === 'Planet'
              ? 'uninhabited planet'
              : (objectSpatial.typeLabel ?? object.Kind),
          ...(object.Kind === 'Planet'
            ? {
                inhabited: object.InhabitedInfo !== false,
                selectedCulture: object.Culture ? structuredClone(object.Culture) : null,
                size: object.Size,
              }
            : { otherObjectType: object.ObjectType }),
          inspectorStock:
            object.Kind === 'Planet' && planet
              ? planet.stock
              : {
                  ...emptyStock(),
                  basic: objectSpatial.inspectorBasic ?? '-',
                  politics: objectClaims.stockText,
                },
        })
      )
        return fail(`Systems.${system.Id}.Objects.${object.Id}.Id`);
    }
    for (const poi of system.PointsOfInterest) {
      const display = projectPoi(sector, poi.Id);
      if (!display) return fail(`Systems.${system.Id}.PointsOfInterest.${poi.Id}`);
      if (
        !add(poi, 'PointOfInterest', system.Id, {
          poi: display,
          angleDegrees: poi.AngleDegrees,
          portraitDescription: `${display.typeLabel} point of interest`,
          inspectorStock: {
            ...emptyStock(),
            basic: display.inspectorBasic,
            gm: poi.Intelligence.GM || '-',
          },
        })
      )
        return fail(`Systems.${system.Id}.PointsOfInterest.${poi.Id}.Id`);
    }
    for (const poi of system.HabitablePointsOfInterest) {
      const display = projectHabitablePoi(sector, poi.Id);
      if (!display) return fail(`Systems.${system.Id}.HabitablePointsOfInterest.${poi.Id}`);
      if (
        !add(poi, 'HabitablePointOfInterest', system.Id, {
          habitablePoi: display,
          angleDegrees: poi.AngleDegrees,
          portraitDescription: `${display.typeLabel} habitable point of interest`,
          inspectorStock: display.stock,
          inspectorClaimants: display.polityIds.map((id) => projectPolity(sector, id)!),
        })
      )
        return fail(`Systems.${system.Id}.HabitablePointsOfInterest.${poi.Id}.Id`);
    }
    systems.push({
      id: system.Id,
      starId: system.Star.Id,
      objectIds: system.Objects.map((object) => object.Id),
      poiIds: system.PointsOfInterest.map((poi) => poi.Id),
      habitablePoiIds: system.HabitablePointsOfInterest.map((poi) => poi.Id),
      spatial,
      star,
      claims,
    });
  }
  for (const portal of sector.RoutePortals) {
    if (!systems.some((system) => system.id === portal.SystemId))
      return fail(`RoutePortals.${portal.Id}.SystemId`);
    if (!add(portal, 'RoutePortal', portal.SystemId, { angleDegrees: portal.BoundaryAngleDegrees }))
      return fail(`RoutePortals.${portal.Id}.Id`);
  }
  for (const route of sector.Routes) {
    const display = projectRoute(sector, route.Id, options.preview);
    if (!display) return fail(`Routes.${route.Id}`);
    if (
      !add(route, 'Route', null, {
        route: display,
        inspectorStock: { ...emptyStock(), basic: display.inspectorBasic },
      })
    )
      return fail(`Routes.${route.Id}.Id`);
  }
  if (!entities[sector.PlayerShip.CurrentLocationId]) return fail('PlayerShip.CurrentLocationId');
  if (!add(sector.PlayerShip, 'PlayerShip', null)) return fail('PlayerShip.Id');
  if (sector.StartingWorldId && !entities[sector.StartingWorldId]?.planet)
    return fail('StartingWorldId');
  const polities = sector.Polities.map((polity) => projectPolity(sector, polity.Id));
  if (polities.some((polity) => !polity)) return fail('Polities');
  const conquests = sector.ConquestEvents.map((event) => projectConquest(sector, event.Id));
  if (conquests.some((event) => !event)) return fail('ConquestEvents');
  const culture = projectCultureScreen(sector);
  if (!culture) return fail('Culture');
  return {
    ok: true,
    value: {
      name: sector.SectorName,
      startingWorldId: sector.StartingWorldId,
      playerShipId: sector.PlayerShip.Id,
      playerShipLocationId: sector.PlayerShip.CurrentLocationId,
      playerShipSystemId: entities[sector.PlayerShip.CurrentLocationId].containingSystemId,
      systems,
      routeIds: sector.Routes.map((route) => route.Id),
      portalIds: sector.RoutePortals.map((portal) => portal.Id),
      entities,
      polities: polities as DisplaySectorDTO['polities'],
      conquests: conquests as DisplaySectorDTO['conquests'],
      culture,
    },
  };
}
