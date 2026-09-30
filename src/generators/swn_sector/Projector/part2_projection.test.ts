import { expect, test } from 'vitest';
import { generate } from '../Generator/generate';
import { checkAllInvariants } from '../Generator/generated_sector_invariants';
import { projectObjectSpatial } from './object_spatial_projection';
import { projectObjectKind } from './object_kind_projection';
import { hexRouteDistance, owningRoute, projectRoute } from './route_projection';
import { projectStar } from './star_projection';
import { STAR_PRESENTATION } from '../Data/Projection/star_presentation';
import { directOrbitAuBand } from '../Shared/spatial_interpretation';
import { projectSystemSpatial } from './system_spatial_projection';
import { applySectorEdits } from '../Application/sector_edits';

test('star, system, object, and route projection is pure', () => {
  const sector = generate('part-two-projection');
  const original = structuredClone(sector);
  const system = sector.Systems[0]!;
  const object = system.Objects[0]!;
  const route = sector.Routes[0]!;
  const project = () => ({
    star: projectStar(sector, system.Id),
    system: projectSystemSpatial(sector, system.Id),
    object: projectObjectSpatial(sector, object.Id),
    route: projectRoute(sector, route.Id, 'gm'),
  });
  expect(project()).toEqual(project());
  expect(sector).toEqual(original);
  expect(project().star?.recipe).toBeTruthy();
  expect(project().system?.inspectorBasic).toBe(`${system.Star.StarType} Type`);
  expect(project().object?.effectiveAu).toBeGreaterThan(0);
});

test('every star type projects its existing presentation recipe', () => {
  const sector = generate('part-two-stars');
  const system = sector.Systems[0]!;
  for (const [starType, presentation] of Object.entries(STAR_PRESENTATION)) {
    system.Star.StarType = starType as typeof system.Star.StarType;
    const projected = projectStar(sector, system.Id)!;
    expect(projected).toMatchObject({
      starType,
      color: presentation.color,
      size: presentation.size,
      recipe: presentation.recipe,
    });
    expect(projected.className).toContain(`star-recipe-${presentation.recipe}`);
    expect(projected.styleTokens['--star-core']).toBe(presentation.core);
  }
});

test('moons inherit their direct parent AU and temperature', () => {
  const sector = generate('part-two-moons');
  const system = sector.Systems.find((candidate) =>
    candidate.Objects.some((object) => object.Orbit.ParentObjectId !== null),
  )!;
  const moon = system.Objects.find((object) => object.Orbit.ParentObjectId !== null)!;
  const parent = system.Objects.find((object) => object.Id === moon.Orbit.ParentObjectId)!;
  const moonProjection = projectObjectSpatial(sector, moon.Id)!;
  const parentProjection = projectObjectSpatial(sector, parent.Id)!;
  expect(moon.Orbit).not.toHaveProperty('AU');
  expect(moonProjection.effectiveAu).toBe(parentProjection.effectiveAu);
  expect(moonProjection.temperature).toBe(parentProjection.temperature);

  const missingParent = structuredClone(sector);
  const missingMoon = missingParent.Systems.find(
    (candidate) => candidate.Id === system.Id,
  )!.Objects.find((object) => object.Id === moon.Id)!;
  missingMoon.Orbit.ParentObjectId = 'missing-parent';
  expect(projectObjectSpatial(missingParent, moon.Id)).toBeUndefined();

  const nonPlanetParent = structuredClone(sector);
  const nonPlanetSystem = nonPlanetParent.Systems.find((candidate) => candidate.Id === system.Id)!;
  const other = nonPlanetSystem.Objects.find((object) => object.Kind === 'OtherCelestialObject');
  if (other) {
    nonPlanetSystem.Objects.find((object) => object.Id === moon.Id)!.Orbit.ParentObjectId =
      other.Id;
    expect(projectObjectSpatial(nonPlanetParent, moon.Id)).toBeUndefined();
  }

  const cycle = structuredClone(sector);
  const cycleSystem = cycle.Systems.find((candidate) => candidate.Id === system.Id)!;
  const cycleMoon = cycleSystem.Objects.find((object) => object.Id === moon.Id)!;
  cycleMoon.Orbit.ParentObjectId = moon.Id;
  expect(projectObjectSpatial(cycle, moon.Id)).toBeUndefined();

  const boundary = structuredClone(sector);
  const boundarySystem = boundary.Systems.find((candidate) => candidate.Id === system.Id)!;
  const boundaryParent = boundarySystem.Objects.find((object) => object.Id === parent.Id)!;
  if (boundaryParent.Orbit.ParentObjectId !== null) throw new Error('Expected direct orbit');
  boundaryParent.Orbit.AU = directOrbitAuBand(boundarySystem.Star.StarType, 'Furance')[0];
  expect(projectObjectSpatial(boundary, moon.Id)).toBeUndefined();
});

test('route projection preserves hex steps and route-specific endpoint names', () => {
  const sector = generate('part-two-route');
  const route = sector.Routes[0]!;
  route.Visibility.PoliticsScan = false;
  const gm = projectRoute(sector, route.Id, 'gm')!;
  const player = projectRoute(sector, route.Id, 'player')!;
  expect(gm.hexDistance).toBe(hexRouteDistance(...gm.endpointHexes));
  expect(hexRouteDistance({ Column: 1, Row: 1 }, { Column: 2, Row: 1 })).toBe(1);
  expect(gm.inspectorBasic).toContain(`Spike Length: ${gm.hexDistance}`);
  expect(player.endpointNames).toEqual(
    gm.endpointSystemIds.map(
      (id) => sector.Systems.find((system) => system.Id === id)!.ProceduralName,
    ),
  );
  expect(owningRoute(sector, route.PortalIds[0])?.Id).toBe(route.Id);

  const edited = applySectorEdits(sector, {
    sectorName: sector.SectorName,
    details: { [gm.endpointSystemIds[0]]: { NiceName: 'Edited endpoint' } },
  });
  expect(projectRoute(edited, route.Id, 'gm')?.inspectorBasic).toContain('Edited endpoint');
  expect(projectRoute(edited, route.Id, 'player')?.inspectorBasic).toBe(player.inspectorBasic);
});

test('invalid links and orbit geometry do not produce invented display facts', () => {
  const sector = generate('part-two-invalid');
  const route = sector.Routes[0]!;
  const missingPortal = structuredClone(sector);
  missingPortal.RoutePortals = missingPortal.RoutePortals.filter(
    (portal) => portal.Id !== route.PortalIds[0],
  );
  expect(projectRoute(missingPortal, route.Id, 'gm')).toBeUndefined();

  const duplicateOwner = structuredClone(sector);
  duplicateOwner.Routes[1]!.PortalIds[0] = route.PortalIds[0];
  expect(owningRoute(duplicateOwner, route.PortalIds[0])).toBeUndefined();
  expect(checkAllInvariants(duplicateOwner).some((violation) => violation.RuleId === 'G3')).toBe(
    true,
  );

  const system = sector.Systems[0]!;
  const direct = system.Objects.find((object) => object.Orbit.ParentObjectId === null)!;
  const invalidOrbit = structuredClone(sector);
  const invalidObject = invalidOrbit.Systems[0]!.Objects.find((object) => object.Id === direct.Id)!;
  if (invalidObject.Orbit.ParentObjectId !== null) throw new Error('Expected direct orbit');
  invalidObject.Orbit.AU = 0;
  expect(projectObjectSpatial(invalidOrbit, direct.Id)).toBeUndefined();
});

test('object kind labels follow canonical object and parent links', () => {
  const sector = generate('part-two-kinds');
  const system = sector.Systems[0]!;
  const planet = system.Objects.find((object) => object.Kind === 'Planet')!;
  expect(projectObjectKind(sector, system.Id)).toBe('SYSTEM');
  expect(projectObjectKind(sector, planet.Id)).toBe(
    planet.Orbit.ParentObjectId === null ? 'WORLD' : 'MOON',
  );
  expect(projectObjectKind(sector, sector.RoutePortals[0]!.Id)).toBe('ROUTE PORTAL');
  expect(projectObjectKind(sector, 'missing')).toBe('');
});
