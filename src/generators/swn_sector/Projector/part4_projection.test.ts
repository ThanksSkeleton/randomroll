import { expect, test } from 'vitest';
import { generate } from '../Generator/generate';
import { projectCultureScreen, projectHabitablePoi } from './culture_projection';
import { projectClaims, projectConquest, projectPolity } from './politics_projection';
import { projectWorldTag } from './world_tag_projection';

const seed = 'part-four-projection';

test('politics and culture projection is deterministic and preserves historical snapshots', () => {
  const sector = generate({ seed: seed });
  const original = structuredClone(sector);
  const first = projectCultureScreen(sector);
  expect(first).toEqual(projectCultureScreen(sector));
  expect(sector).toEqual(original);
  expect(first?.worlds.length).toBeGreaterThan(0);
  const polity = sector.Polities[0]!;
  const before = projectPolity(sector, polity.Id)!;
  const home = sector.Systems.flatMap((system) => system.Objects).find(
    (object) => object.Id === polity.HomeworldId,
  )!;
  expect(home.Kind).toBe('Planet');
  if (home.Kind !== 'Planet' || home.InhabitedInfo === false) throw new Error('Missing homeworld');
  const oldTech = home.InhabitedInfo.TechLevel;
  home.InhabitedInfo.TechLevel = oldTech === 0 ? 5 : 0;
  expect(projectPolity(sector, polity.Id)?.attack).not.toBe(before.attack);
  expect(sector.ConquestEvents).toEqual(original.ConquestEvents);
  const event = sector.ConquestEvents[0];
  if (event) {
    const projected = projectConquest(sector, event.Id)!;
    expect(projected.outcome).toBe(event.Attack > event.Defense ? 'CONQUEST' : 'DEFENSE');
    expect(projected.routeDistance).toBe(event.RouteDistance);
  }
  expect(projectClaims(sector, sector.Systems[0]!)?.claimantIds).toEqual(
    [...new Set(sector.Systems[0]!.Objects.flatMap((object) => object.ClaimedByPolityIds))].sort(
      (a, b) => {
        const aName = sector.Polities.find((polity) => polity.Id === a)!.NiceName;
        const bName = sector.Polities.find((polity) => polity.Id === b)!.NiceName;
        return aName.localeCompare(bName) || a.localeCompare(b);
      },
    ),
  );
});

test('tag descriptions and HPOI text are projected without canonical copies', () => {
  const sector = generate({ seed: seed });
  const world = sector.Systems.flatMap((system) => system.Objects).find(
    (object) => object.Kind === 'Planet' && object.InhabitedInfo !== false && object.Culture,
  )!;
  if (world.Kind !== 'Planet' || world.InhabitedInfo === false) throw new Error('Missing culture');
  for (const tag of world.InhabitedInfo.WorldTags)
    expect(projectWorldTag(tag).description).not.toBe('No description available.');
  expect(world).not.toHaveProperty('Complete');
  expect(world.Culture).not.toHaveProperty('worldTags');
  const hpoi = sector.Systems.flatMap((system) => system.HabitablePointsOfInterest).find(
    (item) => item.ParentWorldId === world.Id,
  )!;
  expect(projectHabitablePoi(sector, hpoi.Id)?.stock.basic).toMatch(
    new RegExp(`^${hpoi.HPOIType}(?:\\n|$)`),
  );
  expect(projectHabitablePoi(sector, 'missing')).toBeUndefined();
});
