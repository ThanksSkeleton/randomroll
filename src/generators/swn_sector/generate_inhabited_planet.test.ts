import { expect, test } from 'vitest';
import { generateInhabitedPlanet } from './generate_inhabited_planet';
import { directOrbitTemperatures } from './generation_rules';

function world(
  seed: string,
  forcedTags?: Parameters<typeof generateInhabitedPlanet>[0]['forcedTags'],
) {
  return generateInhabitedPlanet({
    seed,
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

test('filters compact-remnant worlds to usable direct-orbit temperatures', () => {
  const planet = generateInhabitedPlanet({
    seed: 'compact-remnant',
    entityPath: 'system:01:inhabited:01',
    starType: 'White dwarf',
    starHabitability: 0,
    orbit: { AU: 1, AngleDegrees: 0, ParentObjectId: null },
    forcedTags: ['Tomb World', 'Outpost World'],
  });
  expect(directOrbitTemperatures('White dwarf')).toContain(planet.Temperature);
  expect(planet.Temperature).not.toBe('Temperate');
  expect(planet.InhabitedInfo).not.toBe(false);
  expect(planet.InhabitedInfo === false ? undefined : planet.InhabitedInfo.TotalHab).toBe(0);
});

test('allows rank-2 population tags when star habitability is zero', () => {
  const planet = generateInhabitedPlanet({
    seed: 'hab-zero-population-tags',
    entityPath: 'system:01:inhabited:01',
    starType: 'White dwarf',
    starHabitability: 0,
    orbit: { AU: 1, AngleDegrees: 0, ParentObjectId: null },
    forcedTags: ['Cold War', 'Anarchists'],
  });
  if (planet.InhabitedInfo === false) throw new Error('Expected inhabited information');

  expect(planet.InhabitedInfo.TotalHab).toBe(0);
  expect(planet.InhabitedInfo.Population).toBe('Fewer than a million inhabitants');
});

test('constructively enforces tag semantics', () => {
  const tomb = world('tomb-world', ['Tomb World', 'Outpost World']);
  const info = tomb.InhabitedInfo;
  expect(info).not.toBe(false);
  if (info === false) throw new Error('Expected inhabited information');
  expect(info.Population).toBe('Fewer than 500');
  expect(info.TechLevel).toMatch(/[Pp]ostech|Pretech/);

  const industrial = world('industry-world', ['Heavy Industry', 'Major Spaceyard']);
  if (industrial.InhabitedInfo === false) throw new Error('Expected inhabited information');
  expect(industrial.InhabitedInfo.TechLevel).not.toMatch(/Neolithic|Medieval|Early Industrial/);
});

test('constructively generates the Tomb World and Abandoned Colony regression seed', () => {
  const tomb = world('sol-profile-508', ['Tomb World', 'Abandoned Colony']);
  if (tomb.InhabitedInfo === false) throw new Error('Expected inhabited information');

  expect(tomb.InhabitedInfo.TotalHab).toBeLessThanOrEqual(1);
  expect(tomb.InhabitedInfo.Population).toBe('Fewer than 500');
  expect(tomb.InhabitedInfo.TechLevel).toMatch(/[Pp]ostech|Pretech/);
});

test('rejects incompatible water requirements before construction', () => {
  expect(() => world('incompatible-water', ['Desert World', 'Oceanic World'])).toThrow(
    'No feasible forced tag pair',
  );
});
