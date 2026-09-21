import { describe, expect, it } from 'vitest';
import rawAttributes from '../../swn_sector/world_attributes_2.json';
import rawConstraints from '../../swn_sector/world_tag_constraints.json';
import rawTags from '../../swn_sector/world_tags.json';

type AttributeRow = {
  roll: number | string;
  result: string;
  hab?: number;
  habRequired?: number;
  tl?: number;
  populationMin?: number;
  populationMax?: number;
  optionalDescription?: string;
  alien?: boolean;
};

type Constraint = {
  tag: string;
  maxEnvironmentalHab?: number;
  maxAtmospherePercentile?: number;
  minNativeBiospherePercentile?: number;
  minTechLevel?: number;
  minPopulationPercentile?: number;
  maxPopulationPercentile?: number;
  requiresAliens?: boolean;
  specialStates?: string[];
};

const attributes = rawAttributes.tables as Array<{
  id: string;
  rows: AttributeRow[];
}>;
const constraints = rawConstraints.constraints as Constraint[];
const tagNames = (rawTags.tags as Array<{ tag: string }>).map((tag) => tag.tag);
const constraintByTag = new Map(constraints.map((constraint) => [constraint.tag, constraint]));

function table(id: string): AttributeRow[] {
  const found = attributes.find((candidate) => candidate.id === id);
  if (found === undefined) {
    throw new Error(`Missing ${id} table`);
  }
  return found.rows;
}

function rollValues(roll: number | string): number[] {
  if (typeof roll === 'number') {
    return [roll];
  }
  const [start, end] = roll.split('-').map(Number);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function requiredHab(row: AttributeRow, isRequirement = false): number {
  const value = isRequirement ? row.habRequired : row.hab;
  if (value === undefined) throw new Error('Missing required Hab metadata');
  return value;
}

function combinedConstraints(first: string, second: string): Constraint[] {
  return [first, second]
    .map((tag) => constraintByTag.get(tag))
    .filter((constraint): constraint is Constraint => constraint !== undefined);
}

function allowsPopulation(row: AttributeRow, rules: Constraint[], hasAliens: boolean): boolean {
  if (!hasAliens && row.alien === true) {
    return false;
  }
  return rules.every((rule) => {
    const rolls = rollValues(row.roll);
    return (
      (rule.minPopulationPercentile === undefined ||
        rolls.every((roll) => roll >= rule.minPopulationPercentile!)) &&
      (rule.maxPopulationPercentile === undefined ||
        rolls.every((roll) => roll <= rule.maxPopulationPercentile!))
    );
  });
}

function allowsAtmosphere(row: AttributeRow, rules: Constraint[]): boolean {
  return rules.every(
    (rule) =>
      rule.maxAtmospherePercentile === undefined ||
      rollValues(row.roll).every((roll) => roll <= rule.maxAtmospherePercentile!),
  );
}

function allowsNativeBiosphere(row: AttributeRow, rules: Constraint[]): boolean {
  return rules.every(
    (rule) =>
      rule.minNativeBiospherePercentile === undefined ||
      rollValues(row.roll).every((roll) => roll >= rule.minNativeBiospherePercentile!),
  );
}

function allowsTech(row: AttributeRow, rules: Constraint[]): boolean {
  return rules.every(
    (rule) =>
      rule.minTechLevel === undefined || (row.tl !== undefined && row.tl >= rule.minTechLevel),
  );
}

function allowsHab(
  atmosphere: AttributeRow,
  temperature: AttributeRow,
  terranBiosphere: AttributeRow,
  population: AttributeRow,
  techLevel: AttributeRow,
  rules: Constraint[],
): boolean {
  const calculatedHab = Math.min(
    requiredHab(atmosphere),
    requiredHab(temperature),
    requiredHab(terranBiosphere),
  );
  return (
    calculatedHab >= requiredHab(population, true) &&
    calculatedHab >= requiredHab(techLevel, true) &&
    calculatedHab >= requiredHab(terranBiosphere, true) &&
    rules.every(
      (rule) => rule.maxEnvironmentalHab === undefined || calculatedHab <= rule.maxEnvironmentalHab,
    )
  );
}

function hasValidCompletion(first: string, second: string, hasAliens: boolean): boolean {
  const rules = combinedConstraints(first, second);
  for (const population of table('population')) {
    if (!allowsPopulation(population, rules, hasAliens)) continue;
    for (const tech of table('tech_level')) {
      if (!allowsTech(tech, rules)) continue;
      for (const atmosphere of table('atmosphere')) {
        if (!allowsAtmosphere(atmosphere, rules)) continue;
        for (const temperature of table('temperature')) {
          for (const nativeBiosphere of table('native_biosphere')) {
            if (!allowsNativeBiosphere(nativeBiosphere, rules)) continue;
            for (const terranBiosphere of table('terran_biosphere')) {
              if (allowsHab(atmosphere, temperature, terranBiosphere, population, tech, rules)) {
                return true;
              }
            }
          }
        }
      }
    }
  }
  return false;
}

function eligibleTags(hasAliens: boolean): string[] {
  return tagNames.filter((tag) => {
    const constraint = constraintByTag.get(tag);
    return hasAliens || constraint?.requiresAliens !== true;
  });
}

describe('SWN sector V2 constraint checker', () => {
  it('keeps atmosphere results concise and separates optional descriptions', () => {
    expect(table('atmosphere').map((row) => [row.result, row.optionalDescription])).toEqual([
      ['Vacuum', undefined],
      ['Corrosive', undefined],
      ['Invasive', 'penetrates suit seals'],
      ['Corrosive+Invasive', 'penetrates suit seals'],
      ['Inert gas', undefined],
      ['Breathable: Thin/Thick', 'requires pressure mask'],
      ['Breathable', undefined],
    ]);
  });

  it('defines contiguous inclusive numeric population ranges', () => {
    expect(table('population').map((row) => [row.populationMin, row.populationMax])).toEqual([
      [20, 500],
      [501, 1_000_000],
      [1_000_001, 100_000_000],
      [100_000_001, 1_000_000_000],
      [1_000_000_001, 5_000_000_000],
    ]);
  });

  it('references real tags and has valid metadata', () => {
    expect(new Set(constraints.map((rule) => rule.tag)).size).toBe(constraints.length);
    for (const rule of constraints) {
      expect(tagNames).toContain(rule.tag);
      expect(
        rule.maxEnvironmentalHab === undefined ||
          (rule.maxEnvironmentalHab >= 0 && rule.maxEnvironmentalHab <= 3),
      ).toBe(true);
      for (const cutoff of [
        rule.maxAtmospherePercentile,
        rule.minNativeBiospherePercentile,
        rule.minPopulationPercentile,
        rule.maxPopulationPercentile,
      ]) {
        expect(cutoff === undefined || (cutoff >= 1 && cutoff <= 100)).toBe(true);
      }
      expect(
        rule.minTechLevel === undefined || (rule.minTechLevel >= 0 && rule.minTechLevel <= 5),
      ).toBe(true);
    }
  });

  it('excludes ALIEN-dependent tags when aliens are absent', () => {
    const noAlienTags = eligibleTags(false);
    expect(noAlienTags).not.toContain('Primitive Aliens');
    expect(noAlienTags).not.toContain('Xenophiles');
  });

  it('leaves every eligible first tag at least one compatible second tag and full attribute completion', () => {
    for (const hasAliens of [false, true]) {
      const availableTags = eligibleTags(hasAliens);
      for (const first of availableTags) {
        const compatibleSecondTags = availableTags.filter(
          (second) => second !== first && hasValidCompletion(first, second, hasAliens),
        );
        expect(
          compatibleSecondTags,
          `${first} has no valid second tag when hasAliens=${hasAliens}`,
        ).not.toHaveLength(0);
      }
    }
  });
});
