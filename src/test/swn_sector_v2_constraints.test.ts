import { describe, expect, it } from "vitest";
import rawAttributes from "../../swn_sector/world_attributes.json";
import rawConstraints from "../../swn_sector/world_tag_constraints.json";
import rawTags from "../../swn_sector/world_tags.json";

type AttributeRow = {
  roll: number | string;
  result: string;
  hab: number;
  alien?: boolean;
};

type Constraint = {
  tag: string;
  maxHab?: number;
  minBiosphereRoll?: number;
  excludedAtmosphereResults?: string[];
  minTechLevel?: number;
  allowedPopulationRolls?: number[];
  minPopulationRoll?: number;
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

function techRank(row: AttributeRow): number {
  const match = /^TL(\d+)/.exec(row.result);
  if (match === null) {
    throw new Error(`Cannot determine tech level from ${row.result}`);
  }
  return Number(match[1]);
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
    return (rule.allowedPopulationRolls === undefined
      || rolls.every(roll => rule.allowedPopulationRolls?.includes(roll)))
      && (rule.minPopulationRoll === undefined
        || rolls.every(roll => roll >= rule.minPopulationRoll!));
  });
}

function allowsAtmosphere(row: AttributeRow, rules: Constraint[]): boolean {
  return rules.every(rule => !rule.excludedAtmosphereResults?.includes(row.result));
}

function allowsBiosphere(row: AttributeRow, rules: Constraint[]): boolean {
  return rules.every(rule => rule.minBiosphereRoll === undefined
    || rollValues(row.roll).every(roll => roll >= rule.minBiosphereRoll!));
}

function allowsTech(row: AttributeRow, rules: Constraint[]): boolean {
  return rules.every(rule => rule.minTechLevel === undefined
    || techRank(row) >= rule.minTechLevel);
}

function allowsHab(
  atmosphere: AttributeRow,
  temperature: AttributeRow,
  biosphere: AttributeRow,
  population: AttributeRow,
  techLevel: AttributeRow,
  rules: Constraint[],
): boolean {
  const calculatedHab = Math.min(atmosphere.hab, temperature.hab, biosphere.hab);
  return calculatedHab >= population.hab
    && calculatedHab >= techLevel.hab
    && rules.every(rule => rule.maxHab === undefined || calculatedHab <= rule.maxHab);
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
      expect(rule.maxHab === undefined || (rule.maxHab >= 0 && rule.maxHab <= 3)).toBe(true);
      expect(rule.minTechLevel === undefined || rule.minTechLevel >= 0).toBe(true);
    }
  });

  it("excludes ALIEN-dependent tags and alien population results when aliens are absent", () => {
    const noAlienTags = eligibleTags(false);
    expect(noAlienTags).not.toContain("Primitive Aliens");
    expect(noAlienTags).not.toContain("Xenophiles");
    expect(table("population").filter(row => allowsPopulation(row, [], false))
      .some(row => row.alien === true)).toBe(false);
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
