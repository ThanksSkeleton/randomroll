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
  systemEdgeAu,
} from './generation_rules';

test('reviewed tables adapt to canonical values without losing their weights', () => {
  expect(() => assertReviewedTableIntegrity()).not.toThrow();
  expect(TEMPERATURE_TABLE.map((row) => row.Value)).toContain('Temperate (chilly)');
  expect(TEMPERATURE_TABLE.map((row) => row.Value)).toContain('Temperate (warm)');
  expect(STAR_TABLE.reduce((sum, row) => sum + row.Weight, 0)).toBe(100);
  expect(WORLD_TAG_TABLE.map((row) => row.Value)).not.toContain('Primitive Aliens');
  expect(WORLD_TAG_TABLE.every((row) => CANONICAL_WORLD_TAGS.includes(row.Value))).toBe(true);
  expect(POI_TABLE.map((row) => row.Value)).toContain('Deep-space station');
  expect(EXTRA_WORLD_ARCHETYPES.map((row) => row.Archetype)).toContain('KuiperBelt');
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
  expect(systemEdgeAu('G-type')).toBe(4.984);
  expect(systemEdgeAu('A-type')).toBe(28.416);
});
