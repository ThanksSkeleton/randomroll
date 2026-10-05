import { expect, test } from 'vitest';
import {
  CANONICAL_WORLD_TAGS,
  EXTRA_WORLD_ARCHETYPES,
  POI_TABLE,
  SIZE_TABLE,
  STAR_TABLE,
  TEMPERATURE_TABLE,
  WORLD_TAG_DEFINITIONS,
  WORLD_TAG_PROMPT_CATEGORIES,
  WORLD_TAG_TABLE,
  assertReviewedTableIntegrity,
} from './generation_rules';
import { isPoiHostCompatible } from '../Shared/poi_host_interpretation';
import {
  directOrbitAuBand,
  directOrbitAuRange,
  directOrbitTemperatures,
  STAR_AU_WIDTHS,
} from '../Shared/spatial_interpretation';
import {
  normalTemperatureAuBand,
  systemEdgeAu,
} from '../Projector/system_presentation_interpretation';
import { generateTemplateOtherCelestialObject, generateTemplatePlanet } from './planet_templates';
import { generateInhabitedPlanet } from './generate_inhabited_planet';
import { SIZE_HAB } from '../Shared/planet_interpretation';

test('reviewed tables adapt to canonical values without losing their weights', () => {
  expect(() => assertReviewedTableIntegrity()).not.toThrow();
  expect(TEMPERATURE_TABLE.map((row) => row.Value)).toContain('Temperate (chilly)');
  expect(TEMPERATURE_TABLE.map((row) => row.Value)).toContain('Temperate (warm)');
  expect(STAR_TABLE.reduce((sum, row) => sum + row.Weight, 0)).toBe(100);
  expect(WORLD_TAG_TABLE.map((row) => row.Value)).not.toContain('Primitive Aliens');
  expect(WORLD_TAG_TABLE.every((row) => CANONICAL_WORLD_TAGS.includes(row.Value))).toBe(true);
  expect(WORLD_TAG_DEFINITIONS).toHaveLength(100);
  expect(
    WORLD_TAG_DEFINITIONS.every((tag) =>
      WORLD_TAG_PROMPT_CATEGORIES.every(
        (category) =>
          Array.isArray(tag.prompts[category]) &&
          tag.prompts[category].length > 0 &&
          tag.prompts[category].every((prompt) => prompt.length > 0),
      ),
    ),
  ).toBe(true);
  expect(POI_TABLE.map((row) => row.Value)).toContain('Deep-space station');
  expect(POI_TABLE.map((row) => row.Value)).toContain('Comet base');
  expect(POI_TABLE.map((row) => row.Value)).toContain('Comet belt');
  expect(POI_TABLE.map((row) => row.Value)).toContain('Gas Mine');
  expect(POI_TABLE.map((row) => row.Value)).not.toContain('Gas giant mine');
  expect(EXTRA_WORLD_ARCHETYPES.map((row) => row.Archetype)).toContain('KuiperBelt');
});

test('size table covers rocky planets and gas giants with matching habitability', () => {
  expect(SIZE_TABLE.map((row) => row.Value)).toEqual([
    'Luna',
    'Mars',
    'Super-Earth',
    'Earth',
    'Neptune',
    'Jupiter',
  ]);
  expect(SIZE_TABLE.reduce((sum, row) => sum + row.Weight, 0)).toBe(100);
  expect(SIZE_TABLE.filter((row) => SIZE_HAB[row.Value] === 0).map((row) => row.Value)).toEqual([
    'Neptune',
    'Jupiter',
  ]);
});

test('new POIs use Kuiper belts and gas clouds as hosts', () => {
  const kuiperBelt = generateTemplateOtherCelestialObject({
    generationSettings: { seed: 'poi-hosts' },
    entityPath: 'kuiper',
    starType: 'G-type',
    template: 'KuiperBelt',
    orbit: { AU: 0, AngleDegrees: 0, ParentObjectId: null },
  });
  const gasCloud = generateTemplateOtherCelestialObject({
    generationSettings: { seed: 'poi-hosts' },
    entityPath: 'gas-cloud',
    starType: 'G-type',
    template: 'GasCloud',
    orbit: { AU: 0, AngleDegrees: 0, ParentObjectId: null },
  });
  const gasGiant = generateTemplatePlanet({
    generationSettings: { seed: 'poi-hosts' },
    entityPath: 'gas-giant',
    starType: 'G-type',
    template: 'Jovian',
    orbit: { AU: 0, AngleDegrees: 0, ParentObjectId: null },
  });

  expect(isPoiHostCompatible('Comet base', kuiperBelt)).toBe(true);
  expect(isPoiHostCompatible('Comet belt', kuiperBelt)).toBe(true);
  expect(isPoiHostCompatible('Gas Mine', gasCloud)).toBe(true);
  expect(isPoiHostCompatible('Refueling station', gasCloud)).toBe(true);
  expect(isPoiHostCompatible('Gas Mine', gasGiant)).toBe(true);
});

test('every POI uses its JSON host predicate for compatible and incompatible objects', () => {
  const orbit = { AU: 1, AngleDegrees: 0, ParentObjectId: null };
  const starType = 'G-type' as const;
  const rockyPlanet = generateTemplatePlanet({
    generationSettings: { seed: 'poi-predicates' },
    entityPath: 'rocky',
    starType,
    template: 'Ioan',
    orbit,
  });
  const gasGiant = generateTemplatePlanet({
    generationSettings: { seed: 'poi-predicates' },
    entityPath: 'gas-giant',
    starType,
    template: 'Jovian',
    orbit,
  });
  const primaryPlanet = generateInhabitedPlanet({
    generationSettings: { seed: 'poi-predicates' },
    entityPath: 'primary',
    starType,
    starHabitability: 3,
    orbit,
  });
  const asteroidBelt = generateTemplateOtherCelestialObject({
    generationSettings: { seed: 'poi-predicates' },
    entityPath: 'asteroid-belt',
    starType,
    template: 'AsteroidBelt',
    orbit,
  });
  const kuiperBelt = generateTemplateOtherCelestialObject({
    generationSettings: { seed: 'poi-predicates' },
    entityPath: 'kuiper-belt',
    starType,
    template: 'KuiperBelt',
    orbit,
  });
  const gasCloud = generateTemplateOtherCelestialObject({
    generationSettings: { seed: 'poi-predicates' },
    entityPath: 'gas-cloud',
    starType,
    template: 'GasCloud',
    orbit,
  });
  const independentStation = { ...asteroidBelt, ObjectType: 'IndependentStation' as const };

  expect(isPoiHostCompatible('Deep-space station', independentStation)).toBe(true);
  expect(isPoiHostCompatible('Deep-space station', gasCloud)).toBe(false);
  for (const type of ['Asteroid base', 'Asteroid belt'] as const) {
    expect(isPoiHostCompatible(type, asteroidBelt)).toBe(true);
    expect(isPoiHostCompatible(type, kuiperBelt)).toBe(false);
  }
  expect(isPoiHostCompatible('Remote moon base', primaryPlanet)).toBe(true);
  expect(isPoiHostCompatible('Remote moon base', rockyPlanet)).toBe(true);
  expect(isPoiHostCompatible('Remote moon base', gasGiant)).toBe(false);
  expect(isPoiHostCompatible('Remote moon base', gasCloud)).toBe(false);
  for (const type of ['Ancient orbital ruin', 'Research base'] as const) {
    expect(isPoiHostCompatible(type, primaryPlanet)).toBe(true);
    expect(isPoiHostCompatible(type, gasGiant)).toBe(true);
    expect(isPoiHostCompatible(type, gasCloud)).toBe(false);
  }
  for (const type of ['Comet base', 'Comet belt'] as const) {
    expect(isPoiHostCompatible(type, kuiperBelt)).toBe(true);
    expect(isPoiHostCompatible(type, asteroidBelt)).toBe(false);
  }
  for (const type of ['Gas Mine', 'Refueling station'] as const) {
    expect(isPoiHostCompatible(type, gasGiant)).toBe(true);
    expect(isPoiHostCompatible(type, gasCloud)).toBe(true);
    expect(isPoiHostCompatible(type, rockyPlanet)).toBe(false);
    expect(isPoiHostCompatible(type, asteroidBelt)).toBe(false);
  }
});

test('compact remnants retain only usable direct-orbit temperature bands', () => {
  expect(directOrbitAuBand('White dwarf', 'Temperate')[0]).toBe(
    directOrbitAuBand('White dwarf', 'Temperate')[1],
  );
  expect(directOrbitTemperatures('White dwarf')).not.toContain('Temperate');
  expect(directOrbitAuBand('White dwarf', 'Furance')[1]).toBeGreaterThan(
    directOrbitAuBand('White dwarf', 'Furance')[0],
  );
});

test('system edge uses the complete configured star AU width span', () => {
  expect(systemEdgeAu('G-type')).toBeCloseTo(4.899);
  expect(systemEdgeAu('A-type')).toBeCloseTo(15.493);
});

test('JSON star widths cover every direct-orbit temperature band', () => {
  for (const starType of Object.keys(STAR_AU_WIDTHS) as Array<keyof typeof STAR_AU_WIDTHS>) {
    const [rangeStart, rangeEnd] = directOrbitAuRange(starType);
    const bands = directOrbitTemperatures(starType)
      .map((temperature) => ({
        temperature,
        range: directOrbitAuBand(starType, temperature),
      }))
      .sort((first, second) => first.range[0] - second.range[0]);

    expect(bands[0]?.range[0]).toBeCloseTo(rangeStart);
    expect(bands.at(-1)?.range[1]).toBeCloseTo(rangeEnd);
    for (let index = 0; index < bands.length; index += 1) {
      const current = bands[index]!;
      expect(current.range[1]).toBeGreaterThan(current.range[0]);
      expect(current.range[0]).toBeGreaterThanOrEqual(rangeStart);
      expect(current.range[1]).toBeLessThanOrEqual(rangeEnd);
      if (index > 0) expect(current.range[0]).toBeCloseTo(bands[index - 1]!.range[1]);
    }
  }
});

test('normal temperature boundaries collapse for remnant stars', () => {
  const [inner, outer] = normalTemperatureAuBand('G-type');
  expect(inner).toBeCloseTo(0.95);
  expect(outer).toBeCloseTo(1.67);
  expect(normalTemperatureAuBand('White dwarf')).toEqual([4.598, 4.598]);
});
