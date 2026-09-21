import { describe, expect, it } from 'vitest';
import {
  cloneSectorTemplate,
  createInitialSectors,
  deleteSelectedObject,
  areAdjacentHexes,
  findContainingSystem,
  findObject,
  getAllSelectableIds,
  updateSelectedVisibility,
  validateSector,
} from './data';
import { VisibilityLevel } from './types';

describe('mock sector data', () => {
  it('creates two valid, data-rich deterministic fixtures', () => {
    const first = createInitialSectors();
    const second = createInitialSectors();
    expect(first).toHaveLength(2);
    expect(first).toEqual(second);
    for (const sector of first) {
      expect(sector.Systems).toHaveLength(20);
      expect(
        getAllSelectableIds(sector).every((id) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
        ),
      ).toBe(true);
      expect(
        sector.Systems.every(({ HexLocation: { X, Y } }) => X >= 1 && X <= 5 && Y >= 1 && Y <= 8),
      ).toBe(true);
      expect(new Set(sector.Systems.map((system) => system.HexLocation.Y))).toEqual(
        new Set([1, 2, 3, 4, 5, 6, 7, 8]),
      );
      expect(
        sector.Routes.every((route) => {
          const a = sector.Systems.find((system) => system.Id === route.SystemId1)!;
          const b = sector.Systems.find((system) => system.Id === route.SystemId2)!;
          return areAdjacentHexes(a.HexLocation, b.HexLocation);
        }),
      ).toBe(true);
      expect(
        sector.Systems.some((system) => system.Worlds.some((world) => world.MoonOf !== null)),
      ).toBe(true);
      expect(
        sector.Systems.every((system) => {
          const planetCount = system.Worlds.filter((world) => world.MoonOf === null).length;
          return planetCount >= 2 && planetCount <= 5;
        }),
      ).toBe(true);
      expect(new Set(sector.DetailsAndVisibility.map((detail) => detail.VisibilityLevel))).toEqual(
        new Set(Object.values(VisibilityLevel)),
      );
      expect(sector.Routes.length).toBeGreaterThan(0);
      expect(validateSector(sector)).toEqual([]);
    }
  });

  it('deep-copies Sector2 with fresh IDs and remapped references', () => {
    const [, template] = createInitialSectors();
    const clone = cloneSectorTemplate(template, 'TEST-SEED', 3);
    const originalIds = new Set(getAllSelectableIds(template));
    expect(clone.SectorName).toBe('Generated-3-TEST-SEED');
    expect(clone.OriginalSeed).toBe('TEST-SEED');
    expect(getAllSelectableIds(clone).every((id) => !originalIds.has(id))).toBe(true);
    expect(validateSector(clone)).toEqual([]);
    expect(clone.Systems[0].Id).not.toBe(template.Systems[0].Id);
    expect(clone.Systems[0].Worlds.some((world) => world.MoonOf !== null)).toBe(true);
  });

  it('supports lookup, visibility updates, and safe deletion', () => {
    const [sector] = createInitialSectors();
    const system = sector.Systems[1];
    const world = system.Worlds[0];
    expect(findObject(sector, world.Id)?.object).toBe(world);
    expect(findContainingSystem(sector, world.Id)).toBe(system);
    expect(updateSelectedVisibility(sector, world.Id, VisibilityLevel.CULTURE_FULL)).toBe(true);
    expect(
      sector.DetailsAndVisibility.find((detail) => detail.Id === world.Id)?.VisibilityLevel,
    ).toBe(VisibilityLevel.CULTURE_FULL);
    expect(deleteSelectedObject(sector, world.Id)).toBe(true);
    expect(findObject(sector, world.Id)).toBeUndefined();
    expect(validateSector(sector)).toEqual([]);
    expect(deleteSelectedObject(sector, sector.PlayerShip.Id)).toBe(false);
  });

  it('cascades world deletion to moons, child POIs, and matching details', () => {
    const [sector] = createInitialSectors();
    const system = sector.Systems.find((candidate) =>
      candidate.Worlds.some((world) => world.MoonOf !== null),
    )!;
    const world = system.Worlds.find(
      (candidate) =>
        candidate.MoonOf === null && system.Worlds.some((moon) => moon.MoonOf === candidate.Id),
    )!;
    const moon = system.Worlds.find((candidate) => candidate.MoonOf === world.Id)!;
    const poi = system.POIs[0];
    poi.ParentObjectId = world.Id;

    expect(deleteSelectedObject(sector, world.Id)).toBe(true);
    expect(findObject(sector, world.Id)).toBeUndefined();
    expect(findObject(sector, moon.Id)).toBeUndefined();
    expect(findObject(sector, poi.Id)).toBeUndefined();
    expect(
      sector.DetailsAndVisibility.some((detail) => [world.Id, moon.Id, poi.Id].includes(detail.Id)),
    ).toBe(false);
    expect(validateSector(sector)).toEqual([]);
  });

  it('prohibits deleting the active system, stars, and the final system', () => {
    const [sector] = createInitialSectors();
    const activeSystem = sector.Systems.find(
      (system) => system.Id === sector.PlayerShip.CurrentSystemId,
    )!;
    expect(deleteSelectedObject(sector, activeSystem.Id)).toBe(false);
    expect(deleteSelectedObject(sector, activeSystem.Star.Id)).toBe(false);

    const oneSystem = structuredClone(sector);
    oneSystem.Systems = [oneSystem.Systems[0]];
    oneSystem.Routes = [];
    expect(deleteSelectedObject(oneSystem, oneSystem.Systems[0].Id)).toBe(false);
  });

  it('reports invalid IDs, references, and visibility values', () => {
    const [sector] = createInitialSectors();
    sector.DetailsAndVisibility[0].VisibilityLevel = 'INVALID' as never;
    sector.Routes[0].SystemId2 = 'missing-system';

    expect(validateSector(sector)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Invalid visibility level'),
        expect.stringContaining('invalid endpoints'),
      ]),
    );
  });
});
