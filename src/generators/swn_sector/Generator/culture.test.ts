import { hpoiProjection, hpoiVisible } from '../Projector/culture_projection';
import { expect, test } from 'vitest';
import { completeWorld, createHabitablePointsOfInterest } from './culture';
import { generate } from './generate';
import type { Planet } from '../BaseDTO/merged_schema';

test('initial completion follows world visibility and later completion is stable', () => {
  const sector = generate('culture-integration');
  const worlds = sector.Systems.flatMap((system) => system.Objects).filter(
    (object): object is Planet => object.Kind === 'Planet' && object.InhabitedInfo !== false,
  );
  expect(worlds.length).toBeGreaterThan(0);
  for (const world of worlds) {
    expect(Boolean(world.Culture)).toBe(world.Visibility.BasicScan);
    expect(world.Culture === null).toBe(!world.Visibility.BasicScan);
    const hpois = sector.Systems.flatMap((system) => system.HabitablePointsOfInterest).filter(
      (hpoi) => hpoi.ParentWorldId === world.Id,
    );
    expect(hpois.length).toBe(3 + world.ClaimedByPolityIds.length);
    expect(hpois.every((hpoi) => !hpoi.Visibility.BasicScan)).toBe(true);
  }
  const incomplete = worlds.find((world) => !world.Culture)!;
  expect(incomplete).toBeDefined();
  const completed = completeWorld(sector, incomplete.Id);
  const filled = completed.Systems.flatMap((system) => system.Objects).find(
    (object) => object.Id === incomplete.Id,
  ) as Planet;
  expect(filled.Culture).not.toBeNull();
  expect(filled.InhabitedInfo && filled.InhabitedInfo.WorldTags).toEqual(
    incomplete.InhabitedInfo && incomplete.InhabitedInfo.WorldTags,
  );
  expect(filled.Visibility).toEqual(incomplete.Visibility);
  expect(completeWorld(completed, incomplete.Id)).toBe(completed);
  expect(completeWorld(sector, incomplete.Id)).toEqual(completed);
});

test('contested worlds suppress infrastructure and assign one garrison per claimant', () => {
  const sector = generate('culture-contest');
  const system = sector.Systems.find((candidate) =>
    candidate.Objects.some((object) => object.Kind === 'Planet' && object.InhabitedInfo !== false),
  )!;
  const world = system.Objects.find(
    (object): object is Planet => object.Kind === 'Planet' && object.InhabitedInfo !== false,
  )!;
  world.ClaimedByPolityIds = sector.Polities.slice(0, 2).map((polity) => polity.Id);
  system.HabitablePointsOfInterest = createHabitablePointsOfInterest(sector.OriginalSeed, system);
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
