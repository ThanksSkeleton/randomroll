import { expect, test } from 'vitest';
import { generateInhabitedPlanet } from './generate_inhabited_planet';
import { directOrbitTemperatures } from '../Shared/spatial_interpretation';
import { planetHabitability } from '../Shared/planet_interpretation';
import { ATMOSPHERE_RANK } from './data_tables';

function world(
  seed: string,
  forcedTags?: Parameters<typeof generateInhabitedPlanet>[0]['forcedTags'],
) {
  return generateInhabitedPlanet({
    generationSettings: { seed },
    entityPath: 'system:01:inhabited:01',
    starType: 'G-type',
    starHabitability: 3,
    orbit: { AU: 1, AngleDegrees: 0, ParentObjectId: null },
    forcedTags,
  });
}

test('builds deterministic complete inhabited terrestrial planets', () => {
  expect(world('inhabited-deterministic')).toEqual(world('inhabited-deterministic'));
  const planet = world('inhabited-complete');
  expect(planet.Kind).toBe('Planet');
  expect(planet.InhabitedInfo).not.toBe(false);
  expect(planet.Size).not.toBe('Jupiter');
  expect(planet.Size).not.toBe('Neptune');
});

test('treats World Tag pairs as unordered', () => {
  expect(world('unordered-tags', ['Anarchists', 'Alien Ruins'])).toEqual(
    world('unordered-tags', ['Alien Ruins', 'Anarchists']),
  );
});

test('inhabited worlds never roll gas giant sizes, including on Hab 0 stars', () => {
  for (const star of [
    { type: 'G-type', hab: 3 },
    { type: 'White dwarf', hab: 0 },
  ] as const) {
    for (let index = 0; index < 50; index += 1) {
      const planet = generateInhabitedPlanet({
        generationSettings: { seed: `size-${star.type}-${index}` },
        entityPath: 'system:01:inhabited:01',
        starType: star.type,
        starHabitability: star.hab,
        orbit: { AU: 1, AngleDegrees: 0, ParentObjectId: null },
      });
      expect(['Neptune', 'Jupiter']).not.toContain(planet.Size);
    }
  }
});

test('filters compact-remnant worlds to usable direct-orbit temperatures', () => {
  const planet = generateInhabitedPlanet({
    generationSettings: { seed: 'compact-remnant' },
    entityPath: 'system:01:inhabited:01',
    starType: 'White dwarf',
    starHabitability: 0,
    orbit: { AU: 1, AngleDegrees: 0, ParentObjectId: null },
    forcedTags: ['Tomb World', 'Outpost World'],
  });
  expect(directOrbitTemperatures('White dwarf')).toContain(planet.Temperature);
  expect(planet.Temperature).not.toBe('Temperate');
  expect(planet.InhabitedInfo).not.toBe(false);
  expect(planetHabitability(planet, 0, planet.Temperature)).toBe(0);
});

test('allows rank-2 population tags when star habitability is zero', () => {
  const planet = generateInhabitedPlanet({
    generationSettings: { seed: 'hab-zero-population-tags' },
    entityPath: 'system:01:inhabited:01',
    starType: 'White dwarf',
    starHabitability: 0,
    orbit: { AU: 1, AngleDegrees: 0, ParentObjectId: null },
    forcedTags: ['Cold War', 'Anarchists'],
  });
  if (planet.InhabitedInfo === false) throw new Error('Expected inhabited information');

  expect(planetHabitability(planet, 0, planet.Temperature)).toBe(0);
  expect(planet.InhabitedInfo.Population).toBe(2);
});

test('constructively enforces tag semantics', () => {
  const tomb = world('tomb-world', ['Tomb World', 'Outpost World']);
  const info = tomb.InhabitedInfo;
  expect(info).not.toBe(false);
  if (info === false) throw new Error('Expected inhabited information');
  expect(info.Population).toBe(1);
  expect(info.TechLevel).toBeGreaterThanOrEqual(4);

  const industrial = world('industry-world', ['Heavy Industry', 'Major Spaceyard']);
  if (industrial.InhabitedInfo === false) throw new Error('Expected inhabited information');
  expect(industrial.InhabitedInfo.TechLevel).toBeGreaterThanOrEqual(3);
});

test('generates worlds within rank-based biosphere and atmosphere tag limits', () => {
  const beastmasters = world('biosphere-rank-tags', ['Beastmasters', 'Alien Ruins']);
  expect(beastmasters.NativeBiosphere).toBeGreaterThanOrEqual(4);

  const bubbleCities = world('atmosphere-rank-tags', ['Bubble Cities', 'Alien Ruins']);
  expect(ATMOSPHERE_RANK[bubbleCities.Atmosphere.Category]).toBeLessThanOrEqual(6);
});

test('constructively generates the Tomb World and Abandoned Colony regression seed', () => {
  const tomb = world('sol-profile-508', ['Tomb World', 'Abandoned Colony']);
  if (tomb.InhabitedInfo === false) throw new Error('Expected inhabited information');

  expect(planetHabitability(tomb, 3, tomb.Temperature)).toBeLessThanOrEqual(1);
  expect(tomb.InhabitedInfo.Population).toBe(1);
  expect(tomb.InhabitedInfo.TechLevel).toBeGreaterThanOrEqual(4);
});

test('rejects incompatible water requirements before construction', () => {
  expect(() => world('incompatible-water', ['Desert World', 'Oceanic World'])).toThrow(
    'No feasible forced tag pair',
  );
});
