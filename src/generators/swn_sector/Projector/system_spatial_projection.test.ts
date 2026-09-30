import { expect, test } from 'vitest';
import { generate } from '../Generator/generate';
import { projectSystemSpatial } from './system_spatial_projection';
import { temperatureForDirectOrbitAu } from '../Shared/spatial_interpretation';

test('system spatial projection is repeatable and leaves the sector unchanged', () => {
  const sector = generate('system-spatial-projection');
  const original = structuredClone(sector);
  const system = sector.Systems[0]!;
  const first = projectSystemSpatial(sector, system.Id);
  expect(first).toEqual(projectSystemSpatial(sector, system.Id));
  expect(sector).toEqual(original);
  expect(first?.hexLocation).toEqual(system.HexLocation);
  expect(projectSystemSpatial(sector, 'missing-system')).toBeUndefined();
});

test('normal temperature bands preserve ordinary-star and remnant geometry', () => {
  const sector = generate('system-spatial-bands');
  const system = sector.Systems[0]!;
  system.Star.StarType = 'G-type';
  const ordinary = projectSystemSpatial(sector, system.Id)!;
  expect(ordinary.normalTemperatureAuBand).toEqual([0.95, 1.67]);
  expect(ordinary.systemEdgeAu).toBeCloseTo(4.899);
  expect(ordinary.normalTemperatureBandEmpty).toBe(false);

  system.Star.StarType = 'White dwarf';
  const remnant = projectSystemSpatial(sector, system.Id)!;
  expect(remnant.normalTemperatureAuBand).toEqual([4.598, 4.598]);
  expect(remnant.normalTemperatureBandEmpty).toBe(true);
  expect(remnant.temperatureBands.some((band) => band.temperature === 'Temperate')).toBe(false);
});

test('fixed-seed direct orbit AU resolves to a valid temperature band', () => {
  for (const seed of ['sector-one-seed', 'sector-two-seed', 'system-spatial-projection']) {
    const sector = generate(seed);
    for (const system of sector.Systems)
      for (const object of system.Objects) {
        if (object.Orbit.ParentObjectId !== null) continue;
        expect(temperatureForDirectOrbitAu(system.Star.StarType, object.Orbit.AU)).toBeDefined();
      }
  }
});
