import seedrandom from "seedrandom";
import rawWorldAttributes from "../../../swn_sector/world_attributes.json";
import rawConstraints from "../../../swn_sector/world_tag_constraints.json";
import rawWorldTags from "../../../swn_sector/world_tags.json";
import { SECTOR_V1_GRID, type SectorHex, type WorldAttributeId, type WorldTagReference } from "./sector_v1";

export type WorldAttributeResultV2 = {
  roll: number;
  result: string;
  hab: number;
  alien?: true;
};

export type InhabitedWorldV2 = {
  id: string;
  order: number;
  isPrimary: boolean;
  name: string;
  hasAliens: boolean;
  specialStates: string[];
  tags: readonly [WorldTagReference, WorldTagReference];
  attributes: Record<WorldAttributeId, WorldAttributeResultV2>;
  calculatedHab: number;
};

export type StarSystemV2 = {
  id: string;
  hex: SectorHex;
  worlds: InhabitedWorldV2[];
};

export type SectorV2 = {
  version: "v2";
  seed: string;
  starCount: number;
  systems: StarSystemV2[];
};

export type SectorV2Options = {
  /** Defaults to false. When false, ALIEN-dependent tags and Population 12 are unavailable. */
  hasAliens?: boolean;
};

type RawWorldTag = {
  roll: number;
  tag: string;
};

type RawAttributeRow = {
  roll: number | string;
  result: string;
  hab: number;
  alien?: boolean;
};

type RawAttributeTable = {
  id: WorldAttributeId;
  rows: RawAttributeRow[];
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

type PartialAttributes = Partial<Record<WorldAttributeId, RawAttributeRow>>;

const WORLD_ATTRIBUTE_IDS: readonly WorldAttributeId[] = [
  "atmosphere",
  "temperature",
  "biosphere",
  "population",
  "tech_level",
];

const worldTags = rawWorldTags as { tags: RawWorldTag[] };
const worldAttributes = rawWorldAttributes as { tables: RawAttributeTable[] };
const constraints = rawConstraints.constraints as Constraint[];
const constraintByTag = new Map(constraints.map(constraint => [constraint.tag, constraint]));

function rollDie(rng: seedrandom.PRNG, sides: number): number {
  return Math.floor(rng() * sides) + 1;
}

function roll2d6(rng: seedrandom.PRNG): number {
  return rollDie(rng, 6) + rollDie(rng, 6);
}

function pick<T>(rng: seedrandom.PRNG, values: readonly T[]): T {
  if (values.length === 0) {
    throw new Error("Cannot choose from an empty table");
  }
  return values[Math.floor(rng() * values.length)];
}

function rollValues(roll: number | string): number[] {
  if (typeof roll === "number") {
    return [roll];
  }
  const [start, end] = roll.split("-").map(Number);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function matchesRoll(rolled: number, sourceRoll: number | string): boolean {
  return rollValues(sourceRoll).includes(rolled);
}

function attributeTable(id: WorldAttributeId): RawAttributeTable {
  const table = worldAttributes.tables.find(candidate => candidate.id === id);
  if (table === undefined) {
    throw new Error(`Missing ${id} attribute table`);
  }
  return table;
}

function rowForRoll(id: WorldAttributeId, rolled: number): RawAttributeRow {
  const row = attributeTable(id).rows.find(candidate => matchesRoll(rolled, candidate.roll));
  if (row === undefined) {
    throw new Error(`No ${id} result for ${rolled}`);
  }
  return row;
}

function techRank(row: RawAttributeRow): number {
  const match = /^TL(\d+)/.exec(row.result);
  if (match === null) {
    throw new Error(`Cannot determine tech rank from ${row.result}`);
  }
  return Number(match[1]);
}

function rulesForTags(tags: readonly string[]): Constraint[] {
  return tags.flatMap(tag => {
    const rule = constraintByTag.get(tag);
    return rule === undefined ? [] : [rule];
  });
}

function allowsAtmosphere(row: RawAttributeRow, rules: readonly Constraint[]): boolean {
  return rules.every(rule => !rule.excludedAtmosphereResults?.includes(row.result));
}

function allowsBiosphere(row: RawAttributeRow, rules: readonly Constraint[]): boolean {
  return rules.every(rule => rule.minBiosphereRoll === undefined
    || rollValues(row.roll).every(roll => roll >= rule.minBiosphereRoll!));
}

function allowsPopulation(row: RawAttributeRow, rules: readonly Constraint[], hasAliens: boolean): boolean {
  if (!hasAliens && row.alien === true) {
    return false;
  }
  return rules.every((rule) => {
    const rolls = rollValues(row.roll);
    const minimumPopulationRoll = rule.minPopulationRoll;
    return (rule.allowedPopulationRolls === undefined
      || rolls.every(roll => rule.allowedPopulationRolls!.includes(roll)))
      && (minimumPopulationRoll === undefined
        || rolls.every(roll => roll >= minimumPopulationRoll));
  });
}

function allowsTech(row: RawAttributeRow, rules: readonly Constraint[]): boolean {
  return rules.every(rule => rule.minTechLevel === undefined
    || techRank(row) >= rule.minTechLevel);
}

function allowsHab(
  atmosphere: RawAttributeRow,
  temperature: RawAttributeRow,
  biosphere: RawAttributeRow,
  population: RawAttributeRow,
  techLevel: RawAttributeRow,
  rules: readonly Constraint[],
): boolean {
  const calculatedHab = Math.min(atmosphere.hab, temperature.hab, biosphere.hab);
  return calculatedHab >= population.hab
    && calculatedHab >= techLevel.hab
    && rules.every(rule => rule.maxHab === undefined || calculatedHab <= rule.maxHab);
}

/** Whether the supplied partial result can still be completed without violating the tag rules. */
function hasValidCompletion(
  rules: readonly Constraint[],
  hasAliens: boolean,
  partial: PartialAttributes = {},
): boolean {
  const atmospheres = partial.atmosphere === undefined ? attributeTable("atmosphere").rows : [partial.atmosphere];
  const temperatures = partial.temperature === undefined ? attributeTable("temperature").rows : [partial.temperature];
  const biospheres = partial.biosphere === undefined ? attributeTable("biosphere").rows : [partial.biosphere];
  const populations = partial.population === undefined ? attributeTable("population").rows : [partial.population];
  const techLevels = partial.tech_level === undefined ? attributeTable("tech_level").rows : [partial.tech_level];

  for (const population of populations) {
    if (!allowsPopulation(population, rules, hasAliens)) continue;
    for (const tech of techLevels) {
      if (!allowsTech(tech, rules)) continue;
      for (const atmosphere of atmospheres) {
        if (!allowsAtmosphere(atmosphere, rules)) continue;
        for (const temperature of temperatures) {
          for (const biosphere of biospheres) {
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

function eligibleTags(hasAliens: boolean): RawWorldTag[] {
  return worldTags.tags.filter((tag) => {
    const rule = constraintByTag.get(tag.tag);
    return hasAliens || rule?.requiresAliens !== true;
  });
}

function compatibleSecondTags(first: RawWorldTag, hasAliens: boolean): RawWorldTag[] {
  return eligibleTags(hasAliens).filter(second => second.roll !== first.roll
    && hasValidCompletion(rulesForTags([first.tag, second.tag]), hasAliens));
}

function selectTags(rng: seedrandom.PRNG, hasAliens: boolean): readonly [RawWorldTag, RawWorldTag] {
  const firstCandidates = eligibleTags(hasAliens).filter(tag => compatibleSecondTags(tag, hasAliens).length > 0);
  const first = pick(rng, firstCandidates);
  const second = pick(rng, compatibleSecondTags(first, hasAliens));
  return [first, second];
}

function rollConstrainedAttribute(
  rng: seedrandom.PRNG,
  id: WorldAttributeId,
  rules: readonly Constraint[],
  hasAliens: boolean,
  partial: PartialAttributes,
): { row: RawAttributeRow; roll: number } {
  for (let attempts = 0; attempts < 10_000; attempts += 1) {
    const roll = roll2d6(rng);
    const row = rowForRoll(id, roll);
    if (hasValidCompletion(rules, hasAliens, { ...partial, [id]: row })) {
      return { row, roll };
    }
  }
  throw new Error(`Could not roll a valid ${id} result after 10,000 attempts`);
}

function tagToken(tag: string): string {
  const normalized = tag
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized === "" ? "Tag" : normalized;
}

function worldCountForSystem(rng: seedrandom.PRNG): number {
  const percentile = rollDie(rng, 100);
  if (percentile <= 85) {
    return 1;
  }
  if (percentile <= 95) {
    return 2;
  }
  return 3;
}

function buildWorld(
  rng: seedrandom.PRNG,
  systemId: string,
  order: number,
  hasAliens: boolean,
): InhabitedWorldV2 {
  const selectedTags = selectTags(rng, hasAliens);
  const rules = rulesForTags(selectedTags.map(tag => tag.tag));
  const partial: PartialAttributes = {};
  const rolls: Partial<Record<WorldAttributeId, number>> = {};

  for (const id of WORLD_ATTRIBUTE_IDS) {
    const selected = rollConstrainedAttribute(rng, id, rules, hasAliens, partial);
    partial[id] = selected.row;
    rolls[id] = selected.roll;
  }

  const attributes = Object.fromEntries(WORLD_ATTRIBUTE_IDS.map((id) => {
    const row = partial[id];
    if (row === undefined) {
      throw new Error(`Missing generated ${id} attribute`);
    }
    const roll = rolls[id];
    if (roll === undefined) {
      throw new Error(`Missing generated ${id} roll`);
    }
    return [id, {
      roll,
      result: row.result,
      hab: row.hab,
      ...(row.alien === true ? { alien: true as const } : {}),
    }];
  })) as Record<WorldAttributeId, WorldAttributeResultV2>;
  const specialStates = [...new Set(rules.flatMap(rule => rule.specialStates ?? []))];
  const xyz = String(rollDie(rng, 1_000) - 1).padStart(3, "0");

  return {
    id: `${systemId}-world-${String(order).padStart(2, "0")}`,
    order,
    isPrimary: order === 1,
    name: `${tagToken(selectedTags[0].tag)}_${tagToken(selectedTags[1].tag)}_${xyz}`,
    hasAliens,
    specialStates,
    tags: [
      { roll: selectedTags[0].roll, tag: selectedTags[0].tag },
      { roll: selectedTags[1].roll, tag: selectedTags[1].tag },
    ],
    attributes,
    calculatedHab: Math.min(attributes.atmosphere.hab, attributes.temperature.hab, attributes.biosphere.hab),
  };
}

/** Validates a generated world against V2's declarative tag and attribute constraints. */
export function isV2WorldValid(world: InhabitedWorldV2): boolean {
  if (world.tags[0].roll === world.tags[1].roll) {
    return false;
  }
  const rules = rulesForTags(world.tags.map(tag => tag.tag));
  if (!world.hasAliens && rules.some(rule => rule.requiresAliens === true)) {
    return false;
  }
  const partial: PartialAttributes = {};
  for (const id of WORLD_ATTRIBUTE_IDS) {
    const actual = world.attributes[id];
    const expected = rowForRoll(id, actual.roll);
    if (actual.result !== expected.result || actual.hab !== expected.hab || actual.alien !== expected.alien) {
      return false;
    }
    partial[id] = expected;
  }
  const expectedSpecialStates = [...new Set(rules.flatMap(rule => rule.specialStates ?? []))].sort();
  if (JSON.stringify([...world.specialStates].sort()) !== JSON.stringify(expectedSpecialStates)) {
    return false;
  }
  return hasValidCompletion(rules, world.hasAliens, partial)
    && world.calculatedHab === Math.min(
      world.attributes.atmosphere.hab,
      world.attributes.temperature.hab,
      world.attributes.biosphere.hab,
    );
}

function randomEmptyHex(rng: seedrandom.PRNG, occupied: Set<string>): SectorHex {
  while (true) {
    const column = rollDie(rng, SECTOR_V1_GRID.columns);
    const row = rollDie(rng, SECTOR_V1_GRID.rows);
    const key = `${column}:${row}`;
    if (!occupied.has(key)) {
      occupied.add(key);
      return { column, row };
    }
  }
}

/** Generates the constraint-aware V2 sector flow. */
export function generateSectorV2(seed: string, options: SectorV2Options = {}): SectorV2 {
  const rng = seedrandom(seed);
  const hasAliens = options.hasAliens ?? false;
  const starCount = rollDie(rng, 10) + 20;
  const occupied = new Set<string>();
  const systems: StarSystemV2[] = Array.from(
    { length: starCount },
    (_, systemIndex) => ({
      id: `system-${String(systemIndex + 1).padStart(2, "0")}`,
      hex: randomEmptyHex(rng, occupied),
      worlds: [],
    }),
  );

  for (const system of systems) {
    const worldCount = worldCountForSystem(rng);
    system.worlds = Array.from(
      { length: worldCount },
      (_, worldIndex) => buildWorld(rng, system.id, worldIndex + 1, hasAliens),
    );
  }

  return { version: "v2", seed, starCount, systems };
}
