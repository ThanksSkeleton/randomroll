import seedrandom from "seedrandom";
import rawStarTypes from "../../../swn_sector/star_types.json";
import rawWorldAttributes from "../../../swn_sector/world_attributes_2.json";
import rawConstraints from "../../../swn_sector/world_tag_constraints.json";
import rawWorldTags from "../../../swn_sector/world_tags.json";
import { SECTOR_V1_GRID, type SectorHex, type WorldAttributeId, type WorldTagReference } from "./sector_v1";

export type WorldAttributeResultV2 = {
  roll: number;
  result: string;
  hab?: number;
  habRequired?: number;
  thermalOrbits?: string[];
  alien?: true;
};

export type TerrestrialSizeResultV3 = {
  roll: number;
  result: "Luna" | "Mars" | "Earth" | "Super-Earth";
  hab: number;
};

export type InhabitedWorldV2 = {
  id: string;
  order: number;
  orbitSlot: 1 | 2 | 3;
  isPrimary: boolean;
  name: string;
  hasAliens: boolean;
  specialStates: string[];
  tags: readonly [WorldTagReference, WorldTagReference];
  attributes: Record<WorldAttributeId, WorldAttributeResultV2>;
  planetDetails: {
    terrestrialSize: TerrestrialSizeResultV3;
  };
  calculatedHab: number;
};

export type StarSystemV2 = {
  id: string;
  hex: SectorHex;
  worlds: InhabitedWorldV2[];
};

export type StarTypeResultV3 = {
  roll: number;
  result: string;
  hab: number;
  habitableSlots: number;
};

export type StarSystemV3 = {
  id: string;
  hex: SectorHex;
  worlds: InhabitedWorldV2[];
  primaryStar: StarTypeResultV3;
};

export type SectorV3 = {
  version: "v3";
  seed: string;
  starCount: number;
  systems: StarSystemV3[];
};

export type SectorV2 = {
  version: "v2";
  seed: string;
  starCount: number;
  systems: StarSystemV2[];
};

export type SectorV2Options = {
  /** Defaults to false. When false, ALIEN-dependent tags are unavailable. */
  hasAliens?: boolean;
};

type RawWorldTag = {
  roll: number;
  tag: string;
};

type RawAttributeRow = {
  roll: number | string;
  result: string;
  hab?: number;
  habRequired?: number;
  thermalOrbits?: string[];
  alien?: boolean;
};

type RawAttributeTable = {
  id: WorldAttributeId;
  dice: string;
  rows: RawAttributeRow[];
};

type RawStarTypeRow = {
  roll: number | string;
  result: string;
  hab: number;
  habitableSlots: number;
};

type RawTerrestrialSizeRow = {
  roll: number | string;
  result: TerrestrialSizeResultV3["result"];
  hab: number;
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
const starTypes = rawStarTypes as { tables: Array<{ id: string; rows: RawStarTypeRow[] }> };
const terrestrialSizeTable = (rawWorldAttributes as {
  tables: Array<{ id: string; dice: string; rows: RawTerrestrialSizeRow[] }>;
}).tables.find(table => table.id === "terrestrial_size");
const constraints = rawConstraints.constraints as Constraint[];
const constraintByTag = new Map(constraints.map(constraint => [constraint.tag, constraint]));
const completionCache = new Map<string, boolean>();

function rollDie(rng: seedrandom.PRNG, sides: number): number {
  return Math.floor(rng() * sides) + 1;
}

function rollForDice(rng: seedrandom.PRNG, dice: string): number {
  if (dice === "d100") {
    return rollDie(rng, 100);
  }
  throw new Error(`Unsupported attribute dice expression: ${dice}`);
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

function starTypeForRoll(rolled: number): RawStarTypeRow {
  const table = starTypes.tables.find(candidate => candidate.id === "star_type");
  const row = table?.rows.find(candidate => matchesRoll(rolled, candidate.roll));
  if (row === undefined) {
    throw new Error(`No star type result for ${rolled}`);
  }
  return row;
}

function rollTerrestrialSize(rng: seedrandom.PRNG): TerrestrialSizeResultV3 {
  if (terrestrialSizeTable === undefined) {
    throw new Error("Missing terrestrial_size table");
  }
  const roll = rollForDice(rng, terrestrialSizeTable.dice);
  const row = terrestrialSizeTable.rows.find(candidate => matchesRoll(roll, candidate.roll));
  if (row === undefined) {
    throw new Error(`No terrestrial size result for ${roll}`);
  }
  return { roll, result: row.result, hab: row.hab };
}

function requiredHab(row: RawAttributeRow, id: WorldAttributeId): number {
  const value = id === "tech_level" ? row.habRequired : row.hab;
  if (value === undefined) {
    throw new Error(`Missing ${id === "tech_level" ? "habRequired" : "hab"} on ${id} row`);
  }
  return value;
}

function rulesForTags(tags: readonly string[]): Constraint[] {
  return tags.flatMap(tag => {
    const rule = constraintByTag.get(tag);
    return rule === undefined ? [] : [rule];
  });
}

function allowsAtmosphere(row: RawAttributeRow, rules: readonly Constraint[]): boolean {
  return rules.every(rule => rule.maxAtmospherePercentile === undefined
    || rollValues(row.roll).every(roll => roll <= rule.maxAtmospherePercentile!));
}

function allowsBiosphere(row: RawAttributeRow, rules: readonly Constraint[]): boolean {
  return rules.every(rule => rule.minBiospherePercentile === undefined
    || rollValues(row.roll).every(roll => roll >= rule.minBiospherePercentile!));
}

function allowsPopulation(row: RawAttributeRow, rules: readonly Constraint[], hasAliens: boolean): boolean {
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

function allowsTech(row: RawAttributeRow, rules: readonly Constraint[]): boolean {
  return rules.every(rule => rule.minTechLevelPercentile === undefined
    || rollValues(row.roll).every(roll => roll >= rule.minTechLevelPercentile!));
}

function allowsHab(
  atmosphere: RawAttributeRow,
  temperature: RawAttributeRow,
  biosphere: RawAttributeRow,
  population: RawAttributeRow,
  techLevel: RawAttributeRow,
  rules: readonly Constraint[],
): boolean {
  const calculatedHab = Math.min(
    requiredHab(atmosphere, "atmosphere"),
    requiredHab(temperature, "temperature"),
    requiredHab(biosphere, "biosphere"),
  );
  return calculatedHab >= requiredHab(population, "population")
    && calculatedHab >= requiredHab(techLevel, "tech_level")
    && rules.every(rule => rule.maxEnvironmentalHab === undefined || calculatedHab <= rule.maxEnvironmentalHab);
}

/** Whether the supplied partial result can still be completed without violating the tag rules. */
function hasValidCompletion(
  rules: readonly Constraint[],
  hasAliens: boolean,
  partial: PartialAttributes = {},
): boolean {
  const cacheKey = [
    hasAliens,
    rules.map(rule => rule.tag).sort().join("|"),
    ...Object.entries(partial)
      .map(([id, row]) => `${id}:${row.roll}`)
      .sort(),
  ].join(";");
  const cached = completionCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
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
              completionCache.set(cacheKey, true);
              return true;
            }
          }
        }
      }
    }
  }
  completionCache.set(cacheKey, false);
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
    const roll = rollForDice(rng, attributeTable(id).dice);
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

const ORBIT_SLOT_ORDER = [2, 1, 3] as const;

function orbitSlotForOrder(order: number): 1 | 2 | 3 {
  const slot = ORBIT_SLOT_ORDER[order - 1];
  if (slot === undefined) {
    throw new Error(`No orbit slot for world order ${order}`);
  }
  return slot;
}

function selectDependentStarType(
  rng: seedrandom.PRNG,
  requiredHab: number,
  requiredHabitableSlots: number,
): StarTypeResultV3 {
  for (let attempts = 0; attempts < 10_000; attempts += 1) {
    const roll = rollDie(rng, 100);
    const starType = starTypeForRoll(roll);
    if (starType.hab >= requiredHab && starType.habitableSlots >= requiredHabitableSlots) {
      return {
        roll,
        result: starType.result,
        hab: starType.hab,
        habitableSlots: starType.habitableSlots,
      };
    }
  }
  throw new Error(
    `Could not roll a star type with Hab ${requiredHab} and ${requiredHabitableSlots} habitable slots after 10,000 attempts`,
  );
}

function buildWorld(
  rng: seedrandom.PRNG,
  systemId: string,
  order: number,
  hasAliens: boolean,
  selectedTags: readonly [RawWorldTag, RawWorldTag] = selectTags(rng, hasAliens),
): InhabitedWorldV2 {
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
      ...(row.hab === undefined ? {} : { hab: row.hab }),
      ...(row.habRequired === undefined ? {} : { habRequired: row.habRequired }),
      ...(row.thermalOrbits === undefined ? {} : { thermalOrbits: row.thermalOrbits }),
      ...(row.alien === true ? { alien: true as const } : {}),
    }];
  })) as Record<WorldAttributeId, WorldAttributeResultV2>;
  const specialStates = [...new Set(rules.flatMap(rule => rule.specialStates ?? []))];
  const xyz = String(rollDie(rng, 1_000) - 1).padStart(3, "0");
  const terrestrialSize = rollTerrestrialSize(rng);

  return {
    id: `${systemId}-world-${String(order).padStart(2, "0")}`,
    order,
    orbitSlot: orbitSlotForOrder(order),
    isPrimary: order === 1,
    name: `${tagToken(selectedTags[0].tag)}_${tagToken(selectedTags[1].tag)}_${xyz}`,
    hasAliens,
    specialStates,
    tags: [
      { roll: selectedTags[0].roll, tag: selectedTags[0].tag },
      { roll: selectedTags[1].roll, tag: selectedTags[1].tag },
    ],
    attributes,
    planetDetails: { terrestrialSize },
    calculatedHab: Math.min(
      requiredHab(partial.atmosphere!, "atmosphere"),
      requiredHab(partial.temperature!, "temperature"),
      requiredHab(partial.biosphere!, "biosphere"),
    ),
  };
}

/** Validates a V3 system, including its star's dependency on completed inhabited worlds. */
export function isV3SystemValid(system: StarSystemV3): boolean {
  const requiredHab = Math.max(...system.worlds.map(world => world.calculatedHab));
  return system.worlds.length > 0
    && system.worlds.every(isV2WorldValid)
    && system.primaryStar.hab >= requiredHab
    && system.primaryStar.habitableSlots >= system.worlds.length
    && system.worlds.every(world => {
      const size = world.planetDetails.terrestrialSize;
      return size.roll >= 1
        && size.roll <= 100
        && terrestrialSizeTable?.rows.some(row =>
          matchesRoll(size.roll, row.roll) && row.result === size.result && row.hab === size.hab,
        ) === true;
    })
    && starTypeForRoll(system.primaryStar.roll).result === system.primaryStar.result
    && starTypeForRoll(system.primaryStar.roll).hab === system.primaryStar.hab
    && starTypeForRoll(system.primaryStar.roll).habitableSlots === system.primaryStar.habitableSlots;
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
    if (actual.result !== expected.result
      || actual.hab !== expected.hab
      || actual.habRequired !== expected.habRequired
      || JSON.stringify(actual.thermalOrbits) !== JSON.stringify(expected.thermalOrbits)
      || actual.alien !== expected.alien) {
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
      requiredHab(partial.atmosphere!, "atmosphere"),
      requiredHab(partial.temperature!, "temperature"),
      requiredHab(partial.biosphere!, "biosphere"),
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

/** Generates the constraint-aware V3 sector flow, with stars selected after all world results. */
export function generateSectorV3(seed: string, options: SectorV2Options = {}): SectorV3 {
  const rng = seedrandom(seed);
  const hasAliens = options.hasAliens ?? false;
  const starCount = rollDie(rng, 10) + 20;
  const occupied = new Set<string>();
  const plans = Array.from(
    { length: starCount },
    (_, systemIndex) => ({
      id: `system-${String(systemIndex + 1).padStart(2, "0")}`,
      hex: randomEmptyHex(rng, occupied),
      worldCount: worldCountForSystem(rng),
    }),
  );

  // Tags are a sector-wide first pass; all later world results depend on them.
  const tagsByWorldId = new Map<string, readonly [RawWorldTag, RawWorldTag]>();
  for (const plan of plans) {
    for (let order = 1; order <= plan.worldCount; order += 1) {
      tagsByWorldId.set(`${plan.id}-world-${String(order).padStart(2, "0")}`, selectTags(rng, hasAliens));
    }
  }

  const systemsWithoutStars = plans.map((plan) => ({
    id: plan.id,
    hex: plan.hex,
    worlds: Array.from({ length: plan.worldCount }, (_, worldIndex) => {
      const order = worldIndex + 1;
      const worldId = `${plan.id}-world-${String(order).padStart(2, "0")}`;
      const selectedTags = tagsByWorldId.get(worldId);
      if (selectedTags === undefined) {
        throw new Error(`Missing tags for ${worldId}`);
      }
      return buildWorld(rng, plan.id, order, hasAliens, selectedTags);
    }),
  }));

  const systems: StarSystemV3[] = systemsWithoutStars.map(system => ({
    ...system,
    primaryStar: selectDependentStarType(
      rng,
      Math.max(...system.worlds.map(world => world.calculatedHab)),
      system.worlds.length,
    ),
  }));

  return { version: "v3", seed, starCount, systems };
}
