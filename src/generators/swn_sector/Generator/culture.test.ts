import { hpoiProjection, hpoiVisible } from '../Projector/culture_projection';
import { expect, test } from 'vitest';
import { completeWorld, createHabitablePointsOfInterest } from './culture';
import { generate } from './generate';
import { realizeStartingArea } from './realize_starting_area';
import type { Planet } from '../BaseDTO/merged_schema';

test('ordinary generation completes every inhabited world', () => {
  const sector = generate({ seed: 'culture-integration' });
  const worlds = sector.Systems.flatMap((system) => system.Objects).filter(
    (object): object is Planet => object.Kind === 'Planet' && object.InhabitedInfo !== false,
  );
  expect(worlds.length).toBeGreaterThan(0);
  expect(worlds.every((world) => world.Culture !== null)).toBe(true);
});

test('retained starting-area completion follows the central, secondary, and tertiary system set', () => {
  const unrealized = structuredClone(generate({ seed: 'culture-integration' }));
  for (const system of unrealized.Systems)
    for (const object of system.Objects)
      if (object.Kind === 'Planet' && object.InhabitedInfo !== false) object.Culture = null;
  const sector = realizeStartingArea(unrealized);
  const worlds = sector.Systems.flatMap((system) => system.Objects).filter(
    (object): object is Planet => object.Kind === 'Planet' && object.InhabitedInfo !== false,
  );
  expect(worlds.length).toBeGreaterThan(0);
  const centralSystem = sector.Systems.find((system) =>
    system.Objects.some((object) => object.Id === sector.StartingWorldId),
  )!;
  const centralAndSecondarySystemIds = new Set([centralSystem.Id]);
  for (const route of sector.Routes) {
    const portals = route.PortalIds.map((id) =>
      sector.RoutePortals.find((portal) => portal.Id === id)!,
    );
    if (!portals.some((portal) => portal.SystemId === centralSystem.Id)) continue;
    for (const portal of portals) centralAndSecondarySystemIds.add(portal.SystemId);
  }
  const systemIdByWorldId = new Map(
    sector.Systems.flatMap((system) =>
      system.Objects.map((object) => [object.Id, system.Id] as const),
    ),
  );
  const polityHomeSystemId = new Map(
    sector.Polities.map((polity) => [polity.Id, systemIdByWorldId.get(polity.HomeworldId)]),
  );
  const expectedCultureSystemIds = new Set(centralAndSecondarySystemIds);
  for (const system of sector.Systems) {
    if (!centralAndSecondarySystemIds.has(system.Id)) continue;
    for (const object of system.Objects)
      for (const polityId of object.ClaimedByPolityIds) {
        const homeSystemId = polityHomeSystemId.get(polityId);
        if (homeSystemId) expectedCultureSystemIds.add(homeSystemId);
      }
  }
  for (const world of worlds) {
    const systemId = systemIdByWorldId.get(world.Id)!;
    expect(Boolean(world.Culture)).toBe(expectedCultureSystemIds.has(systemId));
    const hpois = sector.Systems.flatMap((system) => system.HabitablePointsOfInterest).filter(
      (hpoi) => hpoi.ParentWorldId === world.Id,
    );
    expect(hpois.length).toBe(3 + world.ClaimedByPolityIds.length);
    expect(hpois.every((hpoi) => !hpoi.Visibility.BasicScan)).toBe(true);
  }
});

test('contested worlds suppress infrastructure and assign one garrison per claimant', () => {
  const sector = generate({ seed: 'culture-contest' });
  const system = sector.Systems.find((candidate) =>
    candidate.Objects.some((object) => object.Kind === 'Planet' && object.InhabitedInfo !== false),
  )!;
  const world = system.Objects.find(
    (object): object is Planet => object.Kind === 'Planet' && object.InhabitedInfo !== false,
  )!;
  world.ClaimedByPolityIds = sector.Polities.slice(0, 2).map((polity) => polity.Id);
  system.HabitablePointsOfInterest = createHabitablePointsOfInterest(
    { seed: sector.OriginalSeed },
    system,
  );
  const completed = completeWorld(
    {
      ...sector,
      Systems: sector.Systems.map((candidate) =>
        candidate.Id === system.Id
          ? {
              ...system,
              Objects: system.Objects.map((object) =>
                object.Id === world.Id ? { ...world, Culture: null } : object,
              ),
            }
          : candidate,
      ),
    },
    world.Id,
  );
  const hpois = completed.Systems.find(
    (candidate) => candidate.Id === system.Id,
  )!.HabitablePointsOfInterest.filter((hpoi) => hpoi.ParentWorldId === world.Id);
  expect(
    hpois.filter((hpoi) => hpoi.HPOIType === 'Garrison').map((hpoi) => hpoi.AssignedPolityId),
  ).toEqual(world.ClaimedByPolityIds);
  for (const hpoi of hpois.filter((hpoi) => hpoi.HPOIType !== 'Garrison')) {
    expect(hpoiProjection(completed, hpoi).reason).toBe('Contested world');
    expect(hpoiVisible(completed, hpoi, 'gm')).toBe(false);
  }
  const completedWorld = completed.Systems.flatMap((system) => system.Objects).find(
    (object): object is Planet => object.Id === world.Id && object.Kind === 'Planet',
  )!;
  completedWorld.Culture!.planetaryDefenses.patrolBoatPresence = 'Escorts / NPC Admirals';
  const [lowPolity, highPolity] = completed.Polities.slice(0, 2);
  for (const [polity, level] of [
    [lowPolity, 1],
    [highPolity, 4],
  ] as const) {
    const home = completed.Systems.flatMap((system) => system.Objects).find(
      (object): object is Planet => object.Id === polity.HomeworldId && object.Kind === 'Planet',
    )!;
    if (home.InhabitedInfo !== false) home.InhabitedInfo.TechLevel = level;
  }
  const garrisons = hpois.filter((hpoi) => hpoi.HPOIType === 'Garrison');
  expect(hpoiProjection(completed, garrisons[0]!).fields[0]?.[1]).toBe('NONE');
  expect(hpoiProjection(completed, garrisons[1]!).fields[0]?.[1]).toBe('Escorts / NPC Admirals');
});
