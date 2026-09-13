import { describe, expect, it } from "vitest";
import rawAttributes from "../../swn_sector/world_attributes_2.json";
import rawConstraints from "../../swn_sector/world_tag_constraints.json";
import rawTags from "../../swn_sector/world_tags.json";

type AttributeRow = {
  roll: number | string;
  result: string;
  hab?: number;
  habRequired?: number;
  alien?: boolean;
};

type Constraint = {
  tag: string;
  maxEnvironmentalHab?: number;
  maxAtmospherePercentile?: number;
  minBiospherePercentile?: number;
  minTechLevelPercentile?: number;
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
const tagNames = (rawTags.tags as Array<{ tag: string }>).map(tag => tag.tag);
const constraintByTag = new Map(constraints.map(constraint => [constraint.tag, constraint]));

function table(id: string): AttributeRow[] {
  const found = attributes.find(candidate => candidate.id === id);
  if (found === undefined) {
    throw new Error(`Missing ${id} table`);
  }
  return found.rows;
}

function rollValues(roll: number | string): number[] {
  if (typeof roll === "number") {
    return [roll];
  }
  const [start, end] = roll.split("-").map(Number);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function requiredHab(row: AttributeRow, isTechLevel = false): number {
  const value = isTechLevel ? row.habRequired : row.hab;
  if (value === undefined) throw new Error("Missing required Hab metadata");
  return value;
}

function combinedConstraints(first: string, second: string): Constraint[] {
  return [first, second]
    .map(tag => constraintByTag.get(tag))
    .filter((constraint): constraint is Constraint => constraint !== undefined);
}

function allowsPopulation(row: AttributeRow, rules: Constraint[], hasAliens: boolean): boolean {
  if (!hasAliens && row.alien === true) {
    return false;
  }
  return rules.every((rule) => {
    const rolls = rollValues(row.roll);
    return (rule.minPopulationPercentile === undefined
      || rolls.every(roll => roll >= rule.minPopulationPercentile!))
      && (rule.maxPopulationPercentile === undefined
        || rolls.every(roll => roll <= rule.maxPopulationPercentile!));
  });
}

function allowsAtmosphere(row: AttributeRow, rules: Constraint[]): boolean {
  return rules.every(rule => rule.maxAtmospherePercentile === undefined
    || rollValues(row.roll).every(roll => roll <= rule.maxAtmospherePercentile!));
}

function allowsBiosphere(row: AttributeRow, rules: Constraint[]): boolean {
  return rules.every(rule => rule.minBiospherePercentile === undefined
    || rollValues(row.roll).every(roll => roll >= rule.minBiospherePercentile!));
}

function allowsTech(row: AttributeRow, rules: Constraint[]): boolean {
  return rules.every(rule => rule.minTechLevelPercentile === undefined
    || rollValues(row.roll).every(roll => roll >= rule.minTechLevelPercentile!));
}

function allowsHab(
  atmosphere: AttributeRow,
  temperature: AttributeRow,
  biosphere: AttributeRow,
  population: AttributeRow,
  techLevel: AttributeRow,
  rules: Constraint[],
): boolean {
  const calculatedHab = Math.min(requiredHab(atmosphere), requiredHab(temperature), requiredHab(biosphere));
  return calculatedHab >= requiredHab(population)
    && calculatedHab >= requiredHab(techLevel, true)
    && rules.every(rule => rule.maxEnvironmentalHab === undefined || calculatedHab <= rule.maxEnvironmentalHab);
}

function hasValidCompletion(first: string, second: string, hasAliens: boolean): boolean {
  const rules = combinedConstraints(first, second);
  for (const population of table("population")) {
    if (!allowsPopulation(population, rules, hasAliens)) continue;
    for (const tech of table("tech_level")) {
      if (!allowsTech(tech, rules)) continue;
      for (const atmosphere of table("atmosphere")) {
        if (!allowsAtmosphere(atmosphere, rules)) continue;
        for (const temperature of table("temperature")) {
          for (const biosphere of table("biosphere")) {
            if (allowsBiosphere(biosphere, rules)
              && allowsHab(atmosphere, temperature, biosphere, population, tech, rules)) {
              return true;
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

describe("SWN sector V2 constraint checker", () => {
  it("references real tags and has valid metadata", () => {
    expect(new Set(constraints.map(rule => rule.tag)).size).toBe(constraints.length);
    for (const rule of constraints) {
      expect(tagNames).toContain(rule.tag);
      expect(rule.maxEnvironmentalHab === undefined || (rule.maxEnvironmentalHab >= 0 && rule.maxEnvironmentalHab <= 3)).toBe(true);
      for (const cutoff of [
        rule.maxAtmospherePercentile,
        rule.minBiospherePercentile,
        rule.minTechLevelPercentile,
        rule.minPopulationPercentile,
        rule.maxPopulationPercentile,
      ]) {
        expect(cutoff === undefined || (cutoff >= 1 && cutoff <= 100)).toBe(true);
      }
    }
  });

  it("excludes ALIEN-dependent tags when aliens are absent", () => {
    const noAlienTags = eligibleTags(false);
    expect(noAlienTags).not.toContain("Primitive Aliens");
    expect(noAlienTags).not.toContain("Xenophiles");
  });

  it("leaves every eligible first tag at least one compatible second tag and full attribute completion", () => {
    for (const hasAliens of [false, true]) {
      const availableTags = eligibleTags(hasAliens);
      for (const first of availableTags) {
        const compatibleSecondTags = availableTags.filter(second => second !== first
          && hasValidCompletion(first, second, hasAliens));
        expect(compatibleSecondTags, `${first} has no valid second tag when hasAliens=${hasAliens}`).not.toHaveLength(0);
      }
    }
  });
});
