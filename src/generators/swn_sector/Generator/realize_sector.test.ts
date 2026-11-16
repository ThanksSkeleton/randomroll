import { describe, expect, it } from 'vitest';
import type { Planet, Sector } from '../BaseDTO/merged_schema';
import { projectSector } from '../Projector/sector_projection';
import { generate } from './generate';
import { checkAllInvariants } from './generated_sector_invariants';
import { realizeSector } from './realize_sector';
import { realizeStartingArea } from './realize_starting_area';

function inhabitedWorlds(sector: Sector): Planet[] {
  return sector.Systems.flatMap((system) => system.Objects).filter(
    (object): object is Planet => object.Kind === 'Planet' && object.InhabitedInfo !== false,
  );
}

function partiallyRealizedSector(seed: string): Sector {
  const sector = structuredClone(generate({ seed }));
  for (const world of inhabitedWorlds(sector)) world.Culture = null;
  return realizeStartingArea(sector);
}

function preservedState(sector: Sector) {
  const visibility = [
    ...sector.Systems.flatMap((system) => [
      system,
      system.Star,
      ...system.Objects,
      ...system.PointsOfInterest,
      ...system.HabitablePointsOfInterest,
    ]),
    ...sector.Routes,
    ...sector.RoutePortals,
    sector.PlayerShip,
  ].map(({ Id, Visibility }) => [Id, Visibility]);
  return {
    seed: sector.OriginalSeed,
    startingWorldId: sector.StartingWorldId,
    ship: sector.PlayerShip,
    systemIds: sector.Systems.map(({ Id }) => Id),
    objectIds: sector.Systems.flatMap((system) => system.Objects.map(({ Id }) => Id)),
    routes: sector.Routes.map(({ Id, PortalIds }) => ({ Id, PortalIds })),
    portals: sector.RoutePortals.map(({ Id, SystemId }) => ({ Id, SystemId })),
    politics: {
      polities: sector.Polities.map(({ Id, HomeworldId, Flag }) => ({ Id, HomeworldId, Flag })),
      events: sector.ConquestEvents,
    },
    hpois: sector.Systems.flatMap((system) => system.HabitablePointsOfInterest),
    visibility,
  };
}

describe('global sector realization', () => {
  it('completes all inhabited worlds and projects into both existing displays', () => {
    const sector = partiallyRealizedSector('global-culture-check');
    const original = structuredClone(sector);
    const initialWorlds = inhabitedWorlds(sector);
    expect(initialWorlds.some((world) => world.Culture === null)).toBe(true);
    const alreadyCompleted = initialWorlds.filter((world) => world.Culture);

    const completed = realizeSector(sector);
    expect(sector).toEqual(original);
    expect(preservedState(completed)).toEqual(preservedState(original));
    expect(inhabitedWorlds(completed).every((world) => world.Culture)).toBe(true);
    expect(checkAllInvariants(completed)).toEqual([]);

    for (const world of alreadyCompleted) {
      const after = inhabitedWorlds(completed).find(({ Id }) => Id === world.Id);
      expect(after).toEqual(world);
    }

    for (const preview of ['gm', 'player'] as const) {
      const projection = projectSector(completed, { preview, assetBaseUrl: '/' });
      expect(projection.ok).toBe(true);
      if (projection.ok && preview === 'gm') {
        expect(projection.value.culture?.worlds).toHaveLength(inhabitedWorlds(completed).length);
      }
    }
  });

  it('is deterministic and does nothing on a fully realized sector', () => {
    const sector = partiallyRealizedSector('global-culture-repeat');
    const first = realizeSector(sector);
    const second = realizeSector(structuredClone(sector));
    expect(second).toEqual(first);
    expect(realizeSector(first)).toBe(first);
  });

  it('rejects an invalid input without changing it', () => {
    const sector = generate({ seed: 'global-culture-invalid' });
    sector.PlayerShip.CurrentLocationId = 'missing';
    const original = structuredClone(sector);
    expect(() => realizeSector(sector)).toThrow(/invalid sector/);
    expect(sector).toEqual(original);
  });
});
