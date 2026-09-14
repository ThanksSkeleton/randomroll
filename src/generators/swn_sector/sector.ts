import seedrandom from "seedrandom";
import rawSystemPoints from "../../../swn_sector/system_points_of_interest.json";
import rawStarTypes from "../../../swn_sector/star_types.json";
import rawWorldAttributes from "../../../swn_sector/world_attributes_2.json";
import rawConstraints from "../../../swn_sector/world_tag_constraints.json";
import rawWorldTags from "../../../swn_sector/world_tags.json";
import { SECTOR_GRID, type SectorHex, type WorldTagReference } from "./sector_shared";

type WorldAttributeId =
  | "atmosphere"
  | "temperature"
  | "native_biosphere"
  | "terran_biosphere"
  | "population"
  | "tech_level";

export type ThermalOrbit = "Too Hot" | "Hot" | "Temperate" | "Cold" | "Too Cold";

export type WorldAttributeResultV2 = {
  roll: number;
  result: string;
  hab?: number;
  habRequired?: number;
  tl?: number;
  populationMin?: number;
  populationMax?: number;
  optionalDescription?: string;
  /** Relative temperature order used to assign inhabited-world orbit slots. */
  orbitalOrder?: number;
  thermalOrbit?: ThermalOrbit;
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

/** Technology/population settlement classification, derived from generated world attributes. */
export type CivilizationTier = "Primitive" | "Facility" | "Substantial" | "Brilliant" | "Domineering";

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
  civilizationTier: CivilizationTier;
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

export type SectorOptions = {
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
  populationMin?: number;
  populationMax?: number;
  optionalDescription?: string;
  thermalOrbit?: ThermalOrbit;
  alien?: boolean;
  orbitalOrder?: number;
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

function civilizationTier(attributes: Record<WorldAttributeId, WorldAttributeResultV2>): CivilizationTier {
  const technologyLevel = attributes.tech_level.tl ?? 0;
  const lowPopulation = attributes.population.populationMax === 500;
  if (technologyLevel < 4) return "Primitive";
  if (technologyLevel >= 5) return lowPopulation ? "Brilliant" : "Domineering";
  return lowPopulation ? "Facility" : "Substantial";
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
      const leftOrbitalOrder = left.attributes.temperature.orbitalOrder;
      const rightOrbitalOrder = right.attributes.temperature.orbitalOrder;
      if (leftOrbitalOrder === undefined || rightOrbitalOrder === undefined) {
        throw new Error("Missing temperature orbitalOrder while assigning orbit slots");
      }
      return rightOrbitalOrder - leftOrbitalOrder || left.order - right.order;
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
      ...(row.populationMin === undefined ? {} : { populationMin: row.populationMin }),
      ...(row.populationMax === undefined ? {} : { populationMax: row.populationMax }),
      ...(row.optionalDescription === undefined ? {} : { optionalDescription: row.optionalDescription }),
      ...(id === "temperature" && row.orbitalOrder !== undefined
        ? { orbitalOrder: row.orbitalOrder }
        : {}),
      ...(row.thermalOrbit === undefined ? {} : { thermalOrbit: row.thermalOrbit }),
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
    civilizationTier: civilizationTier(attributes),
  };
}

/** Validates a V3 system, including its star's dependency on completed inhabited worlds. */
function isV3SystemValid(system: StarSystemV3): boolean {
  const requiredHab = Math.max(...system.worlds.map(world => world.calculatedHab));
  return system.worlds.length > 0
    && system.worlds.every(isV2WorldValid)
    && new Set(system.worlds.map(world => world.orbitSlot)).size === system.worlds.length
    && [...system.worlds]
      .sort((left, right) => left.orbitSlot - right.orbitSlot)
      .every((world, index, worlds) => index === 0
        || (worlds[index - 1].attributes.temperature.orbitalOrder ?? -1)
          >= (world.attributes.temperature.orbitalOrder ?? -1))
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
function isV2WorldValid(world: InhabitedWorldV2): boolean {
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
      || actual.populationMin !== expected.populationMin
      || actual.populationMax !== expected.populationMax
      || actual.optionalDescription !== expected.optionalDescription
      || actual.orbitalOrder !== (id === "temperature" ? expected.orbitalOrder
        : undefined)
      || actual.thermalOrbit !== expected.thermalOrbit
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
    )
    && world.civilizationTier === civilizationTier(world.attributes);
}

function randomEmptyHex(rng: seedrandom.PRNG, occupied: Set<string>): SectorHex {
  while (true) {
    const column = rollDie(rng, SECTOR_GRID.columns);
    const row = rollDie(rng, SECTOR_GRID.rows);
    const key = `${column}:${row}`;
    if (!occupied.has(key)) {
      occupied.add(key);
      return { column, row };
    }
  }
}

/** Generates the constraint-aware V3 sector flow, with stars selected after all world results. */
function generateSectorV3(seed: string, options: SectorOptions = {}): SectorV3 {
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

export type OrbitalPositionCategory = "TooHot" | "Goldilocks" | "TooCold_1" | "IngressEgress" | "TooCold_3";
export type ExtraWorldCategory = "TerrestrialPlanet" | "GasGiant" | "OtherObject";
export type PointOfInterestV4 = { id: string; kind: "Ingress Point" | "Egress Point" | "Other"; point: string; roll?: number; occupant?: string; situation?: string };
export type PlanetV4 = { id: string; name: string; archetype: string; category: "TerrestrialPlanet" };
export type PlanetDetailsV4 = Omit<InhabitedWorldV2["planetDetails"], "bulkComposition"> & { bulkComposition: Omit<InhabitedWorldV2["planetDetails"]["bulkComposition"], "color"> };
export type PrimaryPlanetV4 = PlanetV4 & Omit<InhabitedWorldV2, "id" | "name" | "order" | "orbitSlot" | "isPrimary" | "planetDetails"> & { kind: "PrimaryPlanet"; archetype: "PrimaryPlanet"; planetDetails: PlanetDetailsV4 };
export type SecondaryPlanetV4 = PlanetV4 & { kind: "SecondaryPlanet"; description: string; pointsOfInterest: PointOfInterestV4[] };
export type EmptyLocationV4 = { kind: "Empty" };
export type GasGiantLocationV4 = { kind: "GasGiant"; id: string; archetype: string; category: "GasGiant"; description: string; pointsOfInterest: PointOfInterestV4[]; satellites: Array<PrimaryPlanetV4 | SecondaryPlanetV4> };
export type OtherObjectLocationV4 = { kind: "OtherObject"; id: string; archetype: string; category: "OtherObject"; description: string; pointsOfInterest: PointOfInterestV4[] };
export type IndependentStationLocationV4 = { kind: "IndependentStation"; id: string; pointsOfInterest: [PointOfInterestV4] };
export type IngressEgressLocationV4 = { kind: "IngressEgress"; id: string; pointsOfInterest: [PointOfInterestV4, PointOfInterestV4] };
export type SystemLocationV4 = EmptyLocationV4 | PrimaryPlanetV4 | SecondaryPlanetV4 | GasGiantLocationV4 | OtherObjectLocationV4 | IndependentStationLocationV4 | IngressEgressLocationV4;
export type LocationSlotV4 = { id: string; orbitalPositionCategory: OrbitalPositionCategory; au: number; habitableSlot?: 1 | 2 | 3; location: SystemLocationV4 };
export type PrimaryStarV4 = { roll: number; result: string; hab: number; maxHabitableSlots: number };
export type StarSystemV4 = Omit<StarSystemV3, "worlds" | "primaryStar"> & { primaryStar: PrimaryStarV4; locationSlots: LocationSlotV4[] };
export type SectorV4 = { version: "v4"; seed: string; starCount: number; systems: StarSystemV4[] };

type RawArchetype = { archetype: string; description: string; category: ExtraWorldCategory };
type RawPoint = { roll: number; point: string; occupants: Array<{ roll: string; result: string }>; situations: Array<{ roll: string; result: string }> };
type RawStarType = { roll: number | string; result: string; hab: number; habitableSlots: number; orbitalZones: { tooHot: string; habitable: string | null; tooCold1: string; warpPoint: string; tooCold2: string; beyond: string } };
type V4Data = { orbitalPositionCategories: OrbitalPositionCategory[]; requiredLocations: Array<{ kind: "EgressIngressRegion"; orbitalPositionCategory: "IngressEgress" }>; extraWorlds: { countDice: "1d6"; minimumByOrbitalPosition: { TooHot: number; TooCold_1: number }; maximumByOrbitalPosition: { TooCold_3: number }; goldilocksOpenSlotExtraChance: number; eligibleArchetypes: string[]; allowedOrbitalPositionCategories: Record<string, OrbitalPositionCategory[]>; moonRules: { terrestrialExtraWorldMayOrbitGasGiant: boolean; terrestrialExtraWorldMoonChance: string; primaryPlanetMoonCreatesParentGasGiant: boolean; parentGasGiantMayUseGoldilocks: boolean } }; pointsOfInterest: { minimumIngressPoints: number; minimumEgressPoints: number; otherCountDice: "1d4+1"; independentOrbit: { kind: "IndependentOrbit"; createdByPoint: "Deep-space station"; onlyContainsPoint: "Deep-space station"; allowedOrbitalPositionCategories: Array<"TooHot" | "TooCold_1" | "TooCold_3"> } } };
const data = rawSystemPoints as { v4: V4Data; extraWorlds: { archetypes: RawArchetype[] }; otherPoint: { rows: RawPoint[] } };
const v4 = data.v4;
const starRows = (rawStarTypes as { tables: Array<{ id: string; rows: RawStarType[] }> }).tables.find(table => table.id === "star_type")?.rows ?? [];
const moonTable = (rawWorldAttributes as { tables: Array<{ id: string; dice: string; rows: Array<{ roll: number | string; result: "Yes" | "No" }> }> }).tables.find(table => table.id === "gas_giant_moon");
const archetypes = new Map(data.extraWorlds.archetypes.map(item => [item.archetype, item]));
const eligible = v4.extraWorlds.eligibleArchetypes.map(name => { const item = archetypes.get(name); if (item === undefined) throw new Error(`Missing archetype ${name}`); return item; });
const die = (rng: seedrandom.PRNG, sides: number) => Math.floor(rng() * sides) + 1;
const choose = <T>(rng: seedrandom.PRNG, values: readonly T[]): T => { if (values.length === 0) throw new Error("Cannot choose from empty values"); return values[die(rng, values.length) - 1]!; };
const matches = (roll: number, range: number | string) => { if (typeof range === "number") return roll === range; const [start, end = start] = range.split("-").map(Number); return roll >= start! && roll <= end!; };
function thermal(world: StarSystemV3["worlds"][number]): string { const value = world.attributes.temperature.thermalOrbit; if (value === undefined) throw new Error(`Missing thermal orbit for ${world.id}`); return value; }
function position(world: StarSystemV3["worlds"][number]): OrbitalPositionCategory { switch (thermal(world)) { case "Too Hot": return "TooHot"; case "Too Cold": return "TooCold_1"; case "Hot": case "Temperate": case "Cold": return "Goldilocks"; default: throw new Error(`Invalid thermal orbit for ${world.id}`); } }
function preferredGoldilocksSlot(orbit: string): 1 | 2 | 3 | undefined { switch (orbit) { case "Hot": return 1; case "Temperate": return 2; case "Cold": return 3; case "Too Hot": case "Too Cold": return undefined; default: throw new Error(`Invalid thermal orbit ${orbit}`); } }
function assignGoldilocksSlots(worlds: readonly { id: string; thermalOrbit: string }[], count: number): Map<string, 1 | 2 | 3> { const available = Array.from({ length: count }, (_, i) => i + 1); const result = new Map<string, 1 | 2 | 3>(); const candidates = worlds.map((world, index) => ({ world, index, preference: preferredGoldilocksSlot(world.thermalOrbit) })).filter((entry): entry is { world: { id: string; thermalOrbit: string }; index: number; preference: 1 | 2 | 3 } => entry.preference !== undefined).sort((a, b) => a.preference - b.preference || a.index - b.index); if (candidates.length > available.length) throw new Error("Insufficient Goldilocks slots"); for (const candidate of candidates) { const index = available.reduce((best, slot, i) => Math.abs(slot - candidate.preference) < Math.abs(available[best]! - candidate.preference) ? i : best, 0); result.set(candidate.world.id, available.splice(index, 1)[0]! as 1 | 2 | 3); } return result; }
function selectStar(rng: seedrandom.PRNG, system: StarSystemV3): StarSystemV3["primaryStar"] { const hab = Math.max(...system.worlds.map(world => world.calculatedHab)); const slots = system.worlds.filter(world => preferredGoldilocksSlot(thermal(world)) !== undefined).length; for (let tries = 0; tries < 10_000; tries += 1) { const roll = die(rng, 100); const row = starRows.find(item => matches(roll, item.roll)); if (row !== undefined && row.hab >= hab && row.habitableSlots >= slots) return { roll, result: row.result, hab: row.hab, habitableSlots: row.habitableSlots }; } throw new Error("Unable to select V4 star"); }
function allowed(archetype: RawArchetype): OrbitalPositionCategory[] { return v4.extraWorlds.allowedOrbitalPositionCategories[archetype.archetype] ?? v4.extraWorlds.allowedOrbitalPositionCategories[archetype.category] ?? []; }
function range(text: string): [number, number] { const values = text.match(/\d+(?:\.\d+)?/g)?.map(Number); if (values === undefined || values.length < 2) throw new Error(`Invalid AU range ${text}`); return [values[0]!, values[1]!]; }
function auRange(star: Pick<PrimaryStarV4, "roll" | "result">, category: OrbitalPositionCategory): [number, number] { const row = starRows.find(item => matches(star.roll, item.roll)); if (row === undefined) throw new Error(`Missing star row ${star.result}`); switch (category) { case "TooHot": return range(row.orbitalZones.tooHot); case "Goldilocks": if (row.orbitalZones.habitable === null) throw new Error(`${star.result} has no habitable range`); return range(row.orbitalZones.habitable); case "TooCold_1": return range(row.orbitalZones.tooCold1); case "IngressEgress": { const au = Number(row.orbitalZones.warpPoint.match(/\d+(?:\.\d+)?/)?.[0]); return [au, au]; } case "TooCold_3": return range(row.orbitalZones.tooCold2); } }
function primary(world: StarSystemV3["worlds"][number]): PrimaryPlanetV4 { const { order: _order, orbitSlot: _orbit, isPrimary: _primary, planetDetails, ...planet } = world; const { color: _color, ...bulkComposition } = planetDetails.bulkComposition; return { ...planet, kind: "PrimaryPlanet", archetype: "PrimaryPlanet", category: "TerrestrialPlanet", planetDetails: { ...planetDetails, bulkComposition } }; }
function secondary(id: string, archetype: RawArchetype): SecondaryPlanetV4 { return { kind: "SecondaryPlanet", id, name: archetype.archetype, archetype: archetype.archetype, category: "TerrestrialPlanet", description: archetype.description, pointsOfInterest: [] }; }
function fromArchetype(id: string, item: RawArchetype): SecondaryPlanetV4 | GasGiantLocationV4 | OtherObjectLocationV4 { if (item.category === "TerrestrialPlanet") return secondary(id, item); if (item.category === "GasGiant") return { kind: "GasGiant", id, archetype: item.archetype, category: "GasGiant", description: item.description, pointsOfInterest: [], satellites: [] }; return { kind: "OtherObject", id, archetype: item.archetype, category: "OtherObject", description: item.description, pointsOfInterest: [] }; }
function locations(slots: readonly LocationSlotV4[]): SystemLocationV4[] { const result: SystemLocationV4[] = []; for (const slot of slots) { result.push(slot.location); if (slot.location.kind === "GasGiant") result.push(...slot.location.satellites); } return result; }
function pointable(location: SystemLocationV4): location is SecondaryPlanetV4 | GasGiantLocationV4 | OtherObjectLocationV4 | IndependentStationLocationV4 | IngressEgressLocationV4 { return "pointsOfInterest" in location; }
function pointCandidates(row: RawPoint, slots: readonly LocationSlotV4[]): Array<SecondaryPlanetV4 | GasGiantLocationV4 | OtherObjectLocationV4> { const candidates = locations(slots).filter((location): location is SecondaryPlanetV4 | GasGiantLocationV4 | OtherObjectLocationV4 => location.kind === "SecondaryPlanet" || location.kind === "GasGiant" || location.kind === "OtherObject"); const filtered = row.point === "Asteroid base" || row.point === "Asteroid belt" ? candidates.filter(location => location.kind === "OtherObject" && location.archetype === "AsteroidBelt") : row.point === "Remote moon base" ? candidates.filter(location => location.kind === "SecondaryPlanet") : row.point === "Ancient orbital ruin" || row.point === "Research base" ? candidates.filter(location => location.kind === "SecondaryPlanet" || location.kind === "GasGiant") : candidates.filter(location => location.kind === "GasGiant"); return filtered.filter(location => location.kind !== "GasGiant" || !location.satellites.some(satellite => satellite.kind === "PrimaryPlanet")); }

function buildSystem(system: StarSystemV3, rng: seedrandom.PRNG): StarSystemV4 {
  const locationSlots: LocationSlotV4[] = []; let slotNo = 0; let locationNo = 0; let pointNo = 0;
  const slotId = () => `${system.id}-slot-${String(++slotNo).padStart(2, "0")}`; const locationId = () => `${system.id}-location-${String(++locationNo).padStart(2, "0")}`; const poi = (value: Omit<PointOfInterestV4, "id">): PointOfInterestV4 => ({ id: `${system.id}-poi-${String(++pointNo).padStart(2, "0")}`, ...value });
  const addSlot = (zone: OrbitalPositionCategory, location: SystemLocationV4, habitableSlot?: 1 | 2 | 3) => { const slot: LocationSlotV4 = { id: slotId(), orbitalPositionCategory: zone, au: 0, location, ...(habitableSlot === undefined ? {} : { habitableSlot }) }; locationSlots.push(slot); return slot; };
  const addPoi = (host: SystemLocationV4, value: Omit<PointOfInterestV4, "id">) => { if (!pointable(host)) throw new Error("Primary planets cannot have POIs"); const valueWithId = poi(value); host.pointsOfInterest.push(valueWithId); return valueWithId; };
  const goldilocks = assignGoldilocksSlots(system.worlds.map(world => ({ id: world.id, thermalOrbit: thermal(world) })), system.primaryStar.habitableSlots);
  for (const world of system.worlds) { const planet = primary(world); const zone = position(world); const habitableSlot = goldilocks.get(world.id); if (world.planetDetails.isGasGiantMoon && v4.extraWorlds.moonRules.primaryPlanetMoonCreatesParentGasGiant) addSlot(zone, { kind: "GasGiant", id: locationId(), archetype: "Jovian", category: "GasGiant", description: "H/He gas giant", pointsOfInterest: [], satellites: [planet] }, habitableSlot); else addSlot(zone, planet, habitableSlot); }
  const occupied = new Set(locationSlots.flatMap(slot => slot.habitableSlot === undefined ? [] : [slot.habitableSlot])); const open = Array.from({ length: system.primaryStar.habitableSlots }, (_, i) => (i + 1) as 1 | 2 | 3).filter(slot => !occupied.has(slot));
  if (open.length > 0 && rng() < v4.extraWorlds.goldilocksOpenSlotExtraChance) { const item = choose(rng, eligible.filter(value => value.category !== "OtherObject")); addSlot("Goldilocks", fromArchetype(locationId(), item), choose(rng, open)); }
  const transit: IngressEgressLocationV4 = { kind: "IngressEgress", id: locationId(), pointsOfInterest: [poi({ kind: "Ingress Point", point: "Ingress Point" }), poi({ kind: "Egress Point", point: "Egress Point" })] }; addSlot("IngressEgress", transit);
  const forced: OrbitalPositionCategory[] = [...Array(v4.extraWorlds.minimumByOrbitalPosition.TooHot).fill("TooHot"), ...Array(v4.extraWorlds.minimumByOrbitalPosition.TooCold_1).fill("TooCold_1")]; let outerCount = 0;
  for (let index = 0; index < Math.max(2, die(rng, 6)); index += 1) { const required = forced[index]; const item = choose(rng, required === undefined ? eligible.filter(value => allowed(value).some(zone => zone !== "TooCold_3" || outerCount < v4.extraWorlds.maximumByOrbitalPosition.TooCold_3)) : eligible.filter(value => allowed(value).includes(required))); const giantSlots = locationSlots.filter(slot => slot.location.kind === "GasGiant" && slot.orbitalPositionCategory !== "Goldilocks" && (slot.orbitalPositionCategory !== "TooCold_3" || outerCount < v4.extraWorlds.maximumByOrbitalPosition.TooCold_3)); const parent = required === undefined && item.category === "TerrestrialPlanet" && giantSlots.length > 0 && v4.extraWorlds.moonRules.terrestrialExtraWorldMayOrbitGasGiant && moonTable?.dice === "d100" && (() => { const roll = die(rng, 100); return moonTable.rows.find(row => matches(roll, row.roll))?.result === "Yes"; })() ? choose(rng, giantSlots) : undefined; const zone = parent?.orbitalPositionCategory ?? choose(rng, required === undefined ? allowed(item).filter(value => value !== "TooCold_3" || outerCount < v4.extraWorlds.maximumByOrbitalPosition.TooCold_3) : [required]); if (zone === "TooCold_3") outerCount += 1; if (parent?.location.kind === "GasGiant") parent.location.satellites.push(secondary(locationId(), item)); else addSlot(zone, fromArchetype(locationId(), item)); }
  for (let index = 0; index < die(rng, 4) + 1; index += 1) { const rows = data.otherPoint.rows.filter(row => row.point === "Deep-space station" || pointCandidates(row, locationSlots).length > 0); const row = choose(rng, rows); let host: SystemLocationV4; if (row.point === "Deep-space station") { const station: IndependentStationLocationV4 = { kind: "IndependentStation", id: locationId(), pointsOfInterest: [] as unknown as [PointOfInterestV4] }; addSlot(choose(rng, v4.pointsOfInterest.independentOrbit.allowedOrbitalPositionCategories), station); host = station; } else host = pointCandidates(row, locationSlots)[0]!; const point = addPoi(host, { kind: "Other", point: row.point, roll: row.roll, occupant: choose(rng, row.occupants).result, situation: choose(rng, row.situations).result }); if (host.kind === "IndependentStation") host.pointsOfInterest = [point]; }
  for (const zone of v4.orbitalPositionCategories) { const slots = locationSlots.filter(slot => slot.orbitalPositionCategory === zone); if (slots.length === 0) continue; const [minimum, maximum] = auRange(system.primaryStar, zone); slots.forEach((slot, index) => { slot.au = minimum + ((maximum - minimum) / slots.length) * (index + rng()); }); }
  locationSlots.sort((left, right) => left.au - right.au || left.id.localeCompare(right.id));
  const { worlds: _worlds, primaryStar, ...withoutWorlds } = system; return { ...withoutWorlds, primaryStar: { roll: primaryStar.roll, result: primaryStar.result, hab: primaryStar.hab, maxHabitableSlots: primaryStar.habitableSlots }, locationSlots };
}
export function generateSector(seed: string, options: SectorOptions = {}): SectorV4 { const v3 = generateSectorV3(seed, options); if (!v3.systems.every(isV3SystemValid)) throw new Error("Generated invalid source sector"); const rng = seedrandom(`${seed}:v4`); const systems = v3.systems.map(system => { const primaryStar = selectStar(rng, system); return buildSystem({ ...system, primaryStar, worlds: system.worlds.map(world => ({ ...world, planetDetails: { ...world.planetDetails, tidallyLocked: primaryStar.result === "M-type" || position(world) === "TooHot" } })) }, rng); }); if (!systems.every(isV4SystemValid)) throw new Error("Generated invalid sector"); return { version: "v4", seed, starCount: v3.starCount, systems }; }
function isV4SystemValid(system: StarSystemV4): boolean { const slots = system.locationSlots; const all = locations(slots); const primaries = all.filter((location): location is PrimaryPlanetV4 => location.kind === "PrimaryPlanet"); const transit = all.filter((location): location is IngressEgressLocationV4 => location.kind === "IngressEgress"); const points = all.flatMap(location => pointable(location) ? location.pointsOfInterest : []); const extras = slots.filter(slot => slot.location.kind === "SecondaryPlanet" || slot.location.kind === "GasGiant" || slot.location.kind === "OtherObject"); const star = starRows.find(row => matches(system.primaryStar.roll, row.roll)); return primaries.length > 0 && primaries.every(planet => planet.tags.length === 2 && planet.planetDetails.bulkComposition.result.length > 0) && star?.result === system.primaryStar.result && system.primaryStar.hab >= Math.max(...primaries.map(planet => planet.calculatedHab)) && transit.length === 1 && transit[0]!.pointsOfInterest[0].kind === "Ingress Point" && transit[0]!.pointsOfInterest[1].kind === "Egress Point" && extras.length >= 2 && extras.length <= 7 && points.filter(point => point.kind === "Other").length >= 2 && points.filter(point => point.kind === "Other").length <= 5 && new Set(slots.map(slot => slot.id)).size === slots.length && slots.every(slot => slot.au >= 0) && slots.every((slot, index) => index === 0 || slots[index - 1]!.au <= slot.au) && new Set(slots.filter(slot => slot.habitableSlot !== undefined).map(slot => slot.habitableSlot)).size === slots.filter(slot => slot.habitableSlot !== undefined).length && slots.filter(slot => slot.habitableSlot !== undefined).every(slot => slot.habitableSlot! <= system.primaryStar.maxHabitableSlots) && all.filter(location => location.kind === "PrimaryPlanet").every(location => !("pointsOfInterest" in location)); }
