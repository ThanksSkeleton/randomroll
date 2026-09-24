import { expect, test, vi } from 'vitest';
import {
  assignDirectOrbitAus,
  assignUniformDirectOrbitAus,
  generateSystem,
  MAX_SYSTEM_GENERATION_RETRIES,
  populatePointsOfInterest,
  retrySystemGeneration,
} from './generate_system';
import {
  directOrbitAuBand,
  directOrbitAuRange,
  isPoiHostCompatible,
  temperatureForDirectOrbitAu,
} from './generation_rules';
import { generateTemplateOtherCelestialObject, generateTemplatePlanet } from './planet_templates';

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
  const placed = assignDirectOrbitAus('aus', 'system:01', 'G-type', [
    { ...first, Temperature: 'Furance' },
    { ...second, Temperature: 'Furance' },
  ]);
  const [minimum, maximum] = directOrbitAuBand('G-type', 'Furance');
  expect(new Set(placed.map((object) => object.Orbit.AU)).size).toBe(2);
  expect(placed.every((object) => object.Orbit.AU > minimum && object.Orbit.AU < maximum)).toBe(
    true,
  );
});

test('non-inhabited objects use class AU ranges and derive temperature from AU', () => {
  const asteroid = generateTemplateOtherCelestialObject({
    seed: 'uniform-aus',
    entityPath: 'asteroid',
    starType: 'G-type',
    template: 'AsteroidBelt',
    orbit: { AU: 0, AngleDegrees: 0, ParentObjectId: null },
  });
  const kuiperBelt = generateTemplateOtherCelestialObject({
    seed: 'uniform-aus',
    entityPath: 'kuiper',
    starType: 'G-type',
    template: 'KuiperBelt',
    orbit: { AU: 0, AngleDegrees: 1, ParentObjectId: null },
  });
  const [minimum, maximum] = directOrbitAuRange('G-type');
  const [coldMinimum, coldMaximum] = directOrbitAuBand('G-type', 'Cryogenic');
  const [placedAsteroid, placedKuiper] = assignUniformDirectOrbitAus(
    'uniform-aus',
    'system:01',
    'G-type',
    [asteroid, kuiperBelt],
  );

  expect(placedAsteroid.Orbit.AU).toBeGreaterThan(minimum);
  expect(placedAsteroid.Orbit.AU).toBeLessThan(maximum);
  expect(placedAsteroid.Temperature).toBe(
    temperatureForDirectOrbitAu('G-type', placedAsteroid.Orbit.AU),
  );
  expect(placedKuiper.Orbit.AU).toBeGreaterThan(coldMinimum);
  expect(placedKuiper.Orbit.AU).toBeLessThan(coldMaximum);
  expect(placedKuiper.Temperature).toBe('Cryogenic');
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

test('failed system generation is logged and retried with deterministic attempt seeds', () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const attempts: string[] = [];
  try {
    const result = retrySystemGeneration('retry-seed', 'system:01', (attemptSeed) => {
      attempts.push(attemptSeed);
      if (attempts.length < 3) throw new Error('incompatible random tag pair');
      return 'generated';
    });

    expect(result).toBe('generated');
    expect(attempts).toEqual([
      'retry-seed',
      'retry-seed:system:01:generation-retry:1',
      'retry-seed:system:01:generation-retry:2',
    ]);
    expect(warning).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenLastCalledWith(
      expect.stringContaining('attempt 2/' + String(MAX_SYSTEM_GENERATION_RETRIES + 1)),
    );
  } finally {
    warning.mockRestore();
  }
});

test('system generation throws after its retry limit', () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    expect(() =>
      retrySystemGeneration('failed-seed', 'system:01', () => {
        throw new Error('no valid planet');
      }),
    ).toThrow(`after ${MAX_SYSTEM_GENERATION_RETRIES + 1} attempts: no valid planet`);
    expect(warning).toHaveBeenCalledTimes(MAX_SYSTEM_GENERATION_RETRIES);
  } finally {
    warning.mockRestore();
  }
});
