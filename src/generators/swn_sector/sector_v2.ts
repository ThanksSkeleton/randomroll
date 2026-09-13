import seedrandom from "seedrandom";
import rawStarTypes from "../../../swn_sector/star_types.json";
import rawWorldAttributes from "../../../swn_sector/world_attributes_2.json";
import rawConstraints from "../../../swn_sector/world_tag_constraints.json";
import rawWorldTags from "../../../swn_sector/world_tags.json";
import { SECTOR_V1_GRID, type SectorHex, type WorldTagReference } from "./sector_v1";

type WorldAttributeId =
  | "atmosphere"
  | "temperature"
  | "native_biosphere"
  | "terran_biosphere"
  | "population"
  | "tech_level";

export type WorldAttributeResultV2 = {
  roll: number;
  result: string;
  hab?: number;
  habRequired?: number;
  tl?: number;
  temperatureValue?: number;
  thermalOrbits?: string[];
  alien?: true;
};

export type TerrestrialSizeResultV3 = {
  roll: number;
  result: "Luna" | "Mars" | "Earth" | "Super-Earth";
  hab: number;
};

export type BulkCompositionResultV3 = {
  roll: number;
  result: string;
  hab: number;
  color: string;
};

export type SurfaceWaterResultV3 = {
  result: "Yes" | "No";
  roll?: number;
  override?: string;
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
    bulkComposition: BulkCompositionResultV3;
    surfaceWaterPresent: SurfaceWaterResultV3;
    isGasGiantMoon: boolean;
    gasGiantMoonRoll: number;
    tidallyLocked: boolean;
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
  tl?: number;
  thermalOrbits?: string[];
  alien?: boolean;
  originalRoll?: number | string;
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

type RawBulkCompositionRow = Omit<BulkCompositionResultV3, "roll"> & {
  roll: number | string;
};

type RawSurfaceWaterRow = {
  roll: number | string;
  result: SurfaceWaterResultV3["result"];
};

type RawGasGiantMoonRow = {
  roll: number | string;
  result: "Yes" | "No";
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

type PartialAttributes = Partial<Record<WorldAttributeId, RawAttributeRow>>;

const WORLD_ATTRIBUTE_IDS: readonly WorldAttributeId[] = [
  "atmosphere",
  "temperature",
  "native_biosphere",
  "terran_biosphere",
  "population",
  "tech_level",
];

const worldTags = rawWorldTags as { tags: RawWorldTag[] };
const worldAttributes = rawWorldAttributes as { tables: RawAttributeTable[] };
const starTypes = rawStarTypes as { tables: Array<{ id: string; rows: RawStarTypeRow[] }> };
const terrestrialSizeTable = (rawWorldAttributes as {
  tables: Array<{ id: string; dice: string; rows: RawTerrestrialSizeRow[] }>;
}).tables.find(table => table.id === "terrestrial_size");
const bulkCompositionTable = (rawWorldAttributes as {
  tables: Array<{ id: string; dice: string; rows: RawBulkCompositionRow[] }>;
}).tables.find(table => table.id === "bulk_composition");
const surfaceWaterTable = (rawWorldAttributes as {
  tables: Array<{ id: string; dice: string; rows: RawSurfaceWaterRow[] }>;
}).tables.find(table => table.id === "surface_water_present");
const gasGiantMoonTable = (rawWorldAttributes as {
  tables: Array<{ id: string; dice: string; rows: RawGasGiantMoonRow[] }>;
}).tables.find(table => table.id === "gas_giant_moon");
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

function rollBulkComposition(rng: seedrandom.PRNG): BulkCompositionResultV3 {
  if (bulkCompositionTable === undefined) {
    throw new Error("Missing bulk_composition table");
  }
  const roll = rollForDice(rng, bulkCompositionTable.dice);
  const row = bulkCompositionTable.rows.find(candidate => matchesRoll(roll, candidate.roll));
  if (row === undefined) {
    throw new Error(`No bulk composition result for ${roll}`);
  }
  return { roll, result: row.result, hab: row.hab, color: row.color };
}

function rollSurfaceWater(rng: seedrandom.PRNG): SurfaceWaterResultV3 {
  if (surfaceWaterTable === undefined) {
    throw new Error("Missing surface_water_present table");
  }
  const roll = rollForDice(rng, surfaceWaterTable.dice);
  const row = surfaceWaterTable.rows.find(candidate => matchesRoll(roll, candidate.roll));
  if (row === undefined) {
    throw new Error(`No surface-water result for ${roll}`);
  }
  return { roll, result: row.result };
}

function rollGasGiantMoon(rng: seedrandom.PRNG): { isGasGiantMoon: boolean; gasGiantMoonRoll: number } {
  if (gasGiantMoonTable === undefined) {
    throw new Error("Missing gas_giant_moon table");
  }
  const gasGiantMoonRoll = rollForDice(rng, gasGiantMoonTable.dice);
  const row = gasGiantMoonTable.rows.find(candidate => matchesRoll(gasGiantMoonRoll, candidate.roll));
  if (row === undefined) {
    throw new Error(`No gas-giant-moon result for ${gasGiantMoonRoll}`);
  }
  return { isGasGiantMoon: row.result === "Yes", gasGiantMoonRoll };
}

function surfaceWaterOverride(
  atmosphere: RawAttributeRow,
  temperature: RawAttributeRow,
  bulkComposition: BulkCompositionResultV3,
  tags: readonly RawWorldTag[],
): SurfaceWaterResultV3 | undefined {
  if (temperature.result === "Cryogenic" || temperature.result === "Volcanic") {
    return { result: "No", override: "Cryogenic or Volcanic temperature" };
  }
  if (atmosphere.result === "Vacuum") {
    return { result: "No", override: "Vacuum atmosphere" };
  }
  if (bulkComposition.result === "Water") {
    return { result: "Yes", override: "Water bulk composition" };
  }
  if (tags.some(tag => tag.tag === "Oceanic World" || tag.tag === "Seagoing Cities")) {
    return { result: "Yes", override: "Oceanic or Seagoing tag" };
  }
  return undefined;
}

function isSurfaceWaterValid(world: InhabitedWorldV2): boolean {
  const surfaceWater = world.planetDetails.surfaceWaterPresent;
  const bulkComposition = world.planetDetails.bulkComposition;
  if (surfaceWater === undefined || bulkComposition === undefined) {
    return false;
  }
  const override = surfaceWaterOverride(
    rowForRoll("atmosphere", world.attributes.atmosphere.roll),
    rowForRoll("temperature", world.attributes.temperature.roll),
    bulkComposition,
    world.tags,
  );
  if (override !== undefined) {
    return surfaceWater.result === override.result
      && surfaceWater.override === override.override
      && surfaceWater.roll === undefined;
  }
  if (surfaceWater.roll === undefined || surfaceWater.override !== undefined) {
    return false;
  }
  return surfaceWaterTable?.rows.some(row =>
    matchesRoll(surfaceWater.roll!, row.roll) && row.result === surfaceWater.result,
  ) === true;
}

function requiredHab(row: RawAttributeRow, id: WorldAttributeId): number {
  const value = id === "population" || id === "tech_level" ? row.habRequired : row.hab;
  if (value === undefined) {
    throw new Error(`Missing ${id === "population" || id === "tech_level" ? "habRequired" : "hab"} on ${id} row`);
  }
  return value;
}

function habRequirement(row: RawAttributeRow, id: WorldAttributeId): number {
  if (row.habRequired === undefined) {
    throw new Error(`Missing habRequired on ${id} row`);
  }
  return row.habRequired;
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

function allowsNativeBiosphere(row: RawAttributeRow, rules: readonly Constraint[]): boolean {
  return rules.every(rule => rule.minNativeBiospherePercentile === undefined
    || rollValues(row.roll).every(roll => roll >= rule.minNativeBiospherePercentile!));
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
  return rules.every(rule => rule.minTechLevel === undefined || row.tl !== undefined && row.tl >= rule.minTechLevel);
}

function allowsHab(
  atmosphere: RawAttributeRow,
  temperature: RawAttributeRow,
  terranBiosphere: RawAttributeRow,
  population: RawAttributeRow,
  techLevel: RawAttributeRow,
  rules: readonly Constraint[],
  additionalHabRatings: readonly number[] = [],
): boolean {
  const calculatedHab = Math.min(
    requiredHab(atmosphere, "atmosphere"),
    requiredHab(temperature, "temperature"),
    requiredHab(terranBiosphere, "terran_biosphere"),
    ...additionalHabRatings,
  );
  return calculatedHab >= requiredHab(population, "population")
    && calculatedHab >= requiredHab(techLevel, "tech_level")
    && calculatedHab >= habRequirement(terranBiosphere, "terran_biosphere")
    && rules.every(rule => rule.maxEnvironmentalHab === undefined || calculatedHab <= rule.maxEnvironmentalHab);
}

function rollCompatibleTerrestrialSize(
  rng: seedrandom.PRNG,
  atmosphere: RawAttributeRow,
  temperature: RawAttributeRow,
  terranBiosphere: RawAttributeRow,
  population: RawAttributeRow,
  techLevel: RawAttributeRow,
  rules: readonly Constraint[],
): TerrestrialSizeResultV3 {
  for (let attempts = 0; attempts < 10_000; attempts += 1) {
    const size = rollTerrestrialSize(rng);
    if (allowsHab(atmosphere, temperature, terranBiosphere, population, techLevel, rules, [size.hab])) {
      return size;
    }
  }
  throw new Error("Could not roll a terrestrial size compatible with world constraints after 10,000 attempts");
}

function rollCompatibleBulkComposition(
  rng: seedrandom.PRNG,
  atmosphere: RawAttributeRow,
  temperature: RawAttributeRow,
  terranBiosphere: RawAttributeRow,
  population: RawAttributeRow,
  techLevel: RawAttributeRow,
  terrestrialSize: TerrestrialSizeResultV3,
  rules: readonly Constraint[],
): BulkCompositionResultV3 {
  for (let attempts = 0; attempts < 10_000; attempts += 1) {
    const bulkComposition = rollBulkComposition(rng);
    if (allowsHab(
      atmosphere,
      temperature,
      terranBiosphere,
      population,
      techLevel,
      rules,
      [terrestrialSize.hab, bulkComposition.hab],
    )) {
      return bulkComposition;
    }
  }
  throw new Error("Could not roll a bulk composition compatible with world constraints after 10,000 attempts");
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
  const nativeBiospheres = partial.native_biosphere === undefined
    ? attributeTable("native_biosphere").rows
    : [partial.native_biosphere];
  const terranBiospheres = partial.terran_biosphere === undefined
    ? attributeTable("terran_biosphere").rows
    : [partial.terran_biosphere];
  const populations = partial.population === undefined ? attributeTable("population").rows : [partial.population];
  const techLevels = partial.tech_level === undefined ? attributeTable("tech_level").rows : [partial.tech_level];

  for (const population of populations) {
    if (!allowsPopulation(population, rules, hasAliens)) continue;
    for (const tech of techLevels) {
      if (!allowsTech(tech, rules)) continue;
      for (const atmosphere of atmospheres) {
        if (!allowsAtmosphere(atmosphere, rules)) continue;
        for (const temperature of temperatures) {
          for (const nativeBiosphere of nativeBiospheres) {
            if (!allowsNativeBiosphere(nativeBiosphere, rules)) continue;
            for (const terranBiosphere of terranBiospheres) {
              if (allowsHab(atmosphere, temperature, terranBiosphere, population, tech, rules)) {
                completionCache.set(cacheKey, true);
                return true;
              }
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

function assignOrbitSlotsByTemperature(worlds: readonly InhabitedWorldV2[]): InhabitedWorldV2[] {
  const orderedWorlds = worlds
    .slice()
    .sort((left, right) => {
      const leftTemperature = left.attributes.temperature.temperatureValue;
      const rightTemperature = right.attributes.temperature.temperatureValue;
      if (leftTemperature === undefined || rightTemperature === undefined) {
        throw new Error("Missing temperatureValue while assigning orbit slots");
      }
      return rightTemperature - leftTemperature || left.order - right.order;
    });
  const slotByWorldId = new Map(orderedWorlds.map((world, index) => [world.id, (index + 1) as 1 | 2 | 3]));
  return worlds.map(world => {
    const orbitSlot = slotByWorldId.get(world.id);
    if (orbitSlot === undefined) {
      throw new Error(`Missing orbit slot for ${world.id}`);
    }
    return { ...world, orbitSlot };
  });
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
      ...(row.tl === undefined ? {} : { tl: row.tl }),
      ...(id === "temperature" && typeof row.originalRoll === "number"
        ? { temperatureValue: row.originalRoll }
        : {}),
      ...(row.thermalOrbits === undefined ? {} : { thermalOrbits: row.thermalOrbits }),
      ...(row.alien === true ? { alien: true as const } : {}),
    }];
  })) as Record<WorldAttributeId, WorldAttributeResultV2>;
  const specialStates = [...new Set(rules.flatMap(rule => rule.specialStates ?? []))];
  const xyz = String(rollDie(rng, 1_000) - 1).padStart(3, "0");
  const terrestrialSize = rollCompatibleTerrestrialSize(
    rng,
    partial.atmosphere!,
    partial.temperature!,
    partial.terran_biosphere!,
    partial.population!,
    partial.tech_level!,
    rules,
  );
  const bulkComposition = rollCompatibleBulkComposition(
    rng,
    partial.atmosphere!,
    partial.temperature!,
    partial.terran_biosphere!,
    partial.population!,
    partial.tech_level!,
    terrestrialSize,
    rules,
  );
  const surfaceWaterPresent = surfaceWaterOverride(
    partial.atmosphere!,
    partial.temperature!,
    bulkComposition,
    selectedTags,
  ) ?? rollSurfaceWater(rng);
  const gasGiantMoon = rollGasGiantMoon(rng);

  return {
    id: `${systemId}-world-${String(order).padStart(2, "0")}`,
    order,
    orbitSlot: 1,
    isPrimary: order === 1,
    name: `${tagToken(selectedTags[0].tag)}_${tagToken(selectedTags[1].tag)}_${xyz}`,
    hasAliens,
    specialStates,
    tags: [
      { roll: selectedTags[0].roll, tag: selectedTags[0].tag },
      { roll: selectedTags[1].roll, tag: selectedTags[1].tag },
    ],
    attributes,
    planetDetails: {
      terrestrialSize,
      bulkComposition,
      surfaceWaterPresent,
      ...gasGiantMoon,
      tidallyLocked: false,
    },
    calculatedHab: Math.min(
      requiredHab(partial.atmosphere!, "atmosphere"),
      requiredHab(partial.temperature!, "temperature"),
      requiredHab(partial.terran_biosphere!, "terran_biosphere"),
      terrestrialSize.hab,
      bulkComposition.hab,
    ),
  };
}

/** Validates a V3 system, including its star's dependency on completed inhabited worlds. */
export function isV3SystemValid(system: StarSystemV3): boolean {
  const requiredHab = Math.max(...system.worlds.map(world => world.calculatedHab));
  return system.worlds.length > 0
    && system.worlds.every(isV2WorldValid)
    && new Set(system.worlds.map(world => world.orbitSlot)).size === system.worlds.length
    && [...system.worlds]
      .sort((left, right) => left.orbitSlot - right.orbitSlot)
      .every((world, index, worlds) => index === 0
        || (worlds[index - 1].attributes.temperature.temperatureValue ?? -1)
          >= (world.attributes.temperature.temperatureValue ?? -1))
    && system.primaryStar.hab >= requiredHab
    && system.primaryStar.habitableSlots >= system.worlds.length
    && system.worlds.every(world => {
      const size = world.planetDetails.terrestrialSize;
      const bulkComposition = world.planetDetails.bulkComposition;
      const surfaceWater = world.planetDetails.surfaceWaterPresent;
      const gasGiantMoonRow = gasGiantMoonTable?.rows.find(row =>
        matchesRoll(world.planetDetails.gasGiantMoonRoll, row.roll),
      );
      const validSize = size.roll >= 1
        && size.roll <= 100
        && terrestrialSizeTable?.rows.some(row =>
          matchesRoll(size.roll, row.roll) && row.result === size.result && row.hab === size.hab,
        ) === true;
      const validBulkComposition = bulkComposition !== undefined
        && bulkComposition.roll >= 1
        && bulkComposition.roll <= 100
        && bulkCompositionTable?.rows.some(row =>
          matchesRoll(bulkComposition.roll, row.roll)
            && row.result === bulkComposition.result
            && row.hab === bulkComposition.hab
            && row.color === bulkComposition.color,
        ) === true;
      return validSize
        && validBulkComposition
        && surfaceWater !== undefined
        && isSurfaceWaterValid(world)
        && gasGiantMoonRow?.result === (world.planetDetails.isGasGiantMoon ? "Yes" : "No")
        && world.planetDetails.tidallyLocked === (system.primaryStar.result === "M-type");
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
      || actual.tl !== expected.tl
      || actual.temperatureValue !== (id === "temperature" && typeof expected.originalRoll === "number"
        ? expected.originalRoll
        : undefined)
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
    && allowsHab(
      partial.atmosphere!,
      partial.temperature!,
      partial.terran_biosphere!,
      partial.population!,
      partial.tech_level!,
      rules,
      [world.planetDetails.terrestrialSize.hab, world.planetDetails.bulkComposition.hab],
    )
    && world.calculatedHab === Math.min(
      requiredHab(partial.atmosphere!, "atmosphere"),
      requiredHab(partial.temperature!, "temperature"),
      requiredHab(partial.terran_biosphere!, "terran_biosphere"),
      world.planetDetails.terrestrialSize.hab,
      world.planetDetails.bulkComposition.hab,
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
    worlds: assignOrbitSlotsByTemperature(Array.from({ length: plan.worldCount }, (_, worldIndex) => {
      const order = worldIndex + 1;
      const worldId = `${plan.id}-world-${String(order).padStart(2, "0")}`;
      const selectedTags = tagsByWorldId.get(worldId);
      if (selectedTags === undefined) {
        throw new Error(`Missing tags for ${worldId}`);
      }
      return buildWorld(rng, plan.id, order, hasAliens, selectedTags);
    })),
  }));

  const systems: StarSystemV3[] = systemsWithoutStars.map(system => {
    const primaryStar = selectDependentStarType(
      rng,
      Math.max(...system.worlds.map(world => world.calculatedHab)),
      system.worlds.length,
    );
    return {
      ...system,
      worlds: system.worlds.map(world => ({
        ...world,
        planetDetails: {
          ...world.planetDetails,
          tidallyLocked: primaryStar.result === "M-type",
        },
      })),
      primaryStar,
    };
  });

  return { version: "v3", seed, starCount, systems };
}
