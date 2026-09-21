import { expect, test } from 'vitest';
import { assignDirectOrbitAus, generateSystem, populatePointsOfInterest } from './generate_system';
import { directOrbitAuBand, isPoiHostCompatible } from './generation_rules';
import { generateTemplatePlanet } from './planet_templates';

test('every planet template expands to a complete canonical uninhabited planet', () => {
  const templates = [
    'Mercurian',
    'Europan / Plutonic',
    'Lunar',
    'Ioan',
    'Titanian',
    'Martian',
    'Venusian',
    'Jovian',
    'Neptunian',
  ] as const;
  for (const template of templates) {
    const planet = generateTemplatePlanet({
      seed: 'templates',
      entityPath: template,
      starType: 'G-type',
      template,
      orbit: { AU: 0, AngleDegrees: 0, ParentObjectId: null },
    });
    expect(planet.InhabitedInfo).toBe(false);
    expect(planet.Id).not.toBe('');
  }
});

test('equal-temperature direct objects receive distinct in-band AUs', () => {
  const first = generateTemplatePlanet({
    seed: 'aus',
    entityPath: 'first',
    starType: 'G-type',
    template: 'Ioan',
    orbit: { AU: 0, AngleDegrees: 0, ParentObjectId: null },
  });
  const second = generateTemplatePlanet({
    seed: 'aus',
    entityPath: 'second',
    starType: 'G-type',
    template: 'Ioan',
    orbit: { AU: 0, AngleDegrees: 1, ParentObjectId: null },
  });
  const placed = assignDirectOrbitAus('aus', 'system:01', 'G-type', [first, second]);
  const [minimum, maximum] = directOrbitAuBand('G-type', 'Volcanic');
  expect(new Set(placed.map((object) => object.Orbit.AU)).size).toBe(2);
  expect(placed.every((object) => object.Orbit.AU > minimum && object.Orbit.AU < maximum)).toBe(
    true,
  );
});

test('system object construction gives moons their parent temperature and AU', () => {
  for (let index = 0; index < 30; index += 1) {
    const system = generateSystem({
      seed: `system-${index}`,
      entityPath: 'system:01',
      hexLocation: { Column: 1, Row: 1 },
      starType: 'G-type',
      starHabitability: 3,
    });
    for (const object of system.Objects.filter((object) => object.Orbit.ParentObjectId !== null)) {
      const parent = system.Objects.find(
        (candidate) => candidate.Id === object.Orbit.ParentObjectId,
      );
      expect(parent).toBeDefined();
      expect(object.Temperature).toBe(parent?.Temperature);
      expect(object.Orbit.AU).toBe(parent?.Orbit.AU);
    }
  }
});

test('POIs are assigned only to compatible hosts with bounded capacity', () => {
  for (let index = 0; index < 20; index += 1) {
    const system = populatePointsOfInterest(
      `pois-${index}`,
      'system:01',
      generateSystem({
        seed: `pois-${index}`,
        entityPath: 'system:01',
        hexLocation: { Column: 1, Row: 1 },
        starType: 'G-type',
        starHabitability: 3,
      }),
    );
    expect(system.PointsOfInterest.length).toBeGreaterThanOrEqual(2);
    expect(system.PointsOfInterest.length).toBeLessThanOrEqual(5);
    for (const poi of system.PointsOfInterest) {
      const host = system.Objects.find((object) => object.Id === poi.ParentObjectId);
      expect(host).toBeDefined();
      if (host !== undefined) expect(isPoiHostCompatible(poi.POIType, host)).toBe(true);
    }
    for (const object of system.Objects)
      expect(
        system.PointsOfInterest.filter((poi) => poi.ParentObjectId === object.Id).length,
      ).toBeLessThanOrEqual(3);
  }
});
