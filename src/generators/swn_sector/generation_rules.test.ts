import { expect, test } from 'vitest';
import {
  CANONICAL_WORLD_TAGS,
  EXTRA_WORLD_ARCHETYPES,
  POI_TABLE,
  STAR_TABLE,
  TEMPERATURE_TABLE,
  WORLD_TAG_TABLE,
  assertReviewedTableIntegrity,
  directOrbitAuBand,
  directOrbitTemperatures,
  isPoiHostCompatible,
  normalTemperatureAuBand,
  systemEdgeAu,
} from './generation_rules';
import { generateTemplateOtherCelestialObject, generateTemplatePlanet } from './planet_templates';

test('reviewed tables adapt to canonical values without losing their weights', () => {
  expect(() => assertReviewedTableIntegrity()).not.toThrow();
  expect(TEMPERATURE_TABLE.map((row) => row.Value)).toContain('Temperate (chilly)');
  expect(TEMPERATURE_TABLE.map((row) => row.Value)).toContain('Temperate (warm)');
  expect(STAR_TABLE.reduce((sum, row) => sum + row.Weight, 0)).toBe(100);
  expect(WORLD_TAG_TABLE.map((row) => row.Value)).not.toContain('Primitive Aliens');
  expect(WORLD_TAG_TABLE.every((row) => CANONICAL_WORLD_TAGS.includes(row.Value))).toBe(true);
  expect(POI_TABLE.map((row) => row.Value)).toContain('Deep-space station');
  expect(POI_TABLE.map((row) => row.Value)).toContain('Comet base');
  expect(POI_TABLE.map((row) => row.Value)).toContain('Comet belt');
  expect(POI_TABLE.map((row) => row.Value)).toContain('Gas Mine');
  expect(POI_TABLE.map((row) => row.Value)).not.toContain('Gas giant mine');
  expect(EXTRA_WORLD_ARCHETYPES.map((row) => row.Archetype)).toContain('KuiperBelt');
});

test('new POIs use Kuiper belts and gas clouds as hosts', () => {
  const kuiperBelt = generateTemplateOtherCelestialObject({
    seed: 'poi-hosts',
    entityPath: 'kuiper',
    starType: 'G-type',
    template: 'KuiperBelt',
    orbit: { AU: 0, AngleDegrees: 0, ParentObjectId: null },
  });
  const gasCloud = generateTemplateOtherCelestialObject({
    seed: 'poi-hosts',
    entityPath: 'gas-cloud',
    starType: 'G-type',
    template: 'GasCloud',
    orbit: { AU: 0, AngleDegrees: 0, ParentObjectId: null },
  });
  const gasGiant = generateTemplatePlanet({
    seed: 'poi-hosts',
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

test('compact remnants retain only usable direct-orbit temperature bands', () => {
  expect(directOrbitAuBand('White dwarf', 'Temperate')[0]).toBe(
    directOrbitAuBand('White dwarf', 'Temperate')[1],
  );
  expect(directOrbitTemperatures('White dwarf')).not.toContain('Temperate');
  expect(directOrbitAuBand('White dwarf', 'Furance')[1]).toBeGreaterThan(
    directOrbitAuBand('White dwarf', 'Furance')[0],
  );
});

test('system edge uses the complete System_AU_Width span', () => {
  expect(systemEdgeAu('G-type')).toBeCloseTo(4.899);
  expect(systemEdgeAu('A-type')).toBeCloseTo(15.493);
});

test('normal temperature boundaries collapse for remnant stars', () => {
  const [inner, outer] = normalTemperatureAuBand('G-type');
  expect(inner).toBeCloseTo(0.95);
  expect(outer).toBeCloseTo(1.67);
  expect(normalTemperatureAuBand('White dwarf')).toEqual([4.598, 4.598]);
});
