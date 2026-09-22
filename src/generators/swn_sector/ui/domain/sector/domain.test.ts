import { describe, expect, it } from 'vitest';
import { generate } from '../../../generate';
import { VisibilityLevel } from '../../../merged_schema';
import { deleteSectorObject, relocatePlayerShip, updateObjectVisibility } from './operations';
import {
  findContainingSystem,
  findDetails,
  findObject,
  routeHasEndpointInSystem,
  routePortals,
  routeSystems,
} from './selectors';
import { validateSector } from './validation';

describe('canonical sector domain', () => {
  it('updates visibility immutably', () => {
    const sector = generate('DOMAIN-VISIBILITY');
    const object = sector.Systems[0].Objects[0];
    const result = updateObjectVisibility(sector, object.Id, VisibilityLevel.CULTURE_FULL);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(findDetails(result.value, object.Id)?.VisibilityLevel).toBe(
      VisibilityLevel.CULTURE_FULL,
    );
    expect(findDetails(sector, object.Id)?.VisibilityLevel).not.toBe(VisibilityLevel.CULTURE_FULL);
  });

  it('moves the ship to an object and derives its containing system', () => {
    const sector = generate('DOMAIN-MOVEMENT');
    const targetSystem = sector.Systems[1];
    const target = targetSystem.Objects[0];
    const result = relocatePlayerShip(sector, target.Id);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(findContainingSystem(result.value, result.value.PlayerShip.CurrentLocationId)?.Id).toBe(
      targetSystem.Id,
    );
  });

  it('resolves route endpoints through portals', () => {
    const sector = generate('DOMAIN-ROUTES');
    const systems = routeSystems(sector, sector.Routes[0]);
    expect(systems).toBeDefined();
    expect(systems?.[0].Id).not.toBe(systems?.[1].Id);
  });

  it('only considers a route relevant to systems at one of its endpoints', () => {
    const sector = generate('DOMAIN-ROUTE-ENDPOINT-FILTER');
    const route = sector.Routes[0];
    const endpoints = routeSystems(sector, route)!;
    const unrelatedSystem = sector.Systems.find(
      (system) => !endpoints.some((endpoint) => endpoint.Id === system.Id),
    )!;

    expect(routeHasEndpointInSystem(sector, route, endpoints[0].Id)).toBe(true);
    expect(routeHasEndpointInSystem(sector, route, endpoints[1].Id)).toBe(true);
    expect(routeHasEndpointInSystem(sector, route, unrelatedSystem.Id)).toBe(false);
  });

  it('deletes a route and its portals while preserving the sector', () => {
    const sector = generate('DOMAIN-ROUTE-DELETION');
    const route = sector.Routes[0];
    const portals = routePortals(sector, route)!;
    const result = deleteSectorObject(sector, route.Id);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(findObject(result.value, route.Id)).toBeUndefined();
    expect(findObject(result.value, portals[0].Id)).toBeUndefined();
    expect(findObject(result.value, portals[1].Id)).toBeUndefined();
    expect(validateSector(result.value)).toEqual([]);
  });

  it('does not allow movement to a route or route portal', () => {
    const sector = generate('DOMAIN-MOVEMENT-RESTRICTIONS');
    expect(relocatePlayerShip(sector, sector.Routes[0].Id).ok).toBe(false);
    expect(relocatePlayerShip(sector, sector.RoutePortals[0].Id).ok).toBe(false);
  });

  it('deletes an object and hosted POIs without invalidating the sector', () => {
    const sector = generate('DOMAIN-DELETION');
    const system = sector.Systems.find((candidate) => candidate.PointsOfInterest.length > 0)!;
    const object = system.Objects.find((candidate) =>
      system.PointsOfInterest.some((poi) => poi.ParentObjectId === candidate.Id),
    );
    if (!object) return;
    const result = deleteSectorObject(sector, object.Id);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(findObject(result.value, object.Id)).toBeUndefined();
    expect(validateSector(result.value)).toEqual([]);
  });
});
