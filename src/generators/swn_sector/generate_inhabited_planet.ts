import type { InhabitedInfo, Orbit, Planet, StarType, WorldTag } from "./merged_schema";
import { deterministicId, chooseWeighted, randomFor } from "./generation_random";
import {
  ATMOSPHERE_TABLE,
  BULK_COMPOSITION_TABLE,
  directOrbitTemperatures,
  NATIVE_BIOSPHERE_TABLE,
  POPULATION_TABLE,
  TECH_LEVEL_TABLE,
  TEMPERATURE_TABLE,
  TERRAN_BIOSPHERE_TABLE,
  TERRESTRIAL_SIZE_TABLE,
  WORLD_TAG_TABLE,
} from "./generation_rules";
import {
  ATMOSPHERE_HAB,
  ATMOSPHERE_MAX_PERCENTILE,
  BULK_COMPOSITION_HAB,
  NATIVE_BIOSPHERE_MIN_PERCENTILE,
  POPULATION_HAB_REQUIRED,
  POPULATION_RANGE,
  SIZE_HAB,
  TECH_HAB_REQUIRED,
  TECH_LEVEL,
  TEMPERATURE_HAB,
  TERRAN_BIOSPHERE_HAB,
  TERRAN_BIOSPHERE_HAB_REQUIRED,
} from "./tables";
import { WORLD_TAG_CONSTRAINTS } from "./generation_rules";

type PhysicalProfile = {
  Atmosphere: Planet["Atmosphere"];
  Temperature: Planet["Temperature"];
  NativeBiosphere: Planet["NativeBiosphere"];
  TerranBiosphere: InhabitedInfo["TerranBiosphere"];
  Size: Planet["Size"];
  BulkComposition: Planet["BulkComposition"];
  Population: InhabitedInfo["Population"];
  TechLevel: InhabitedInfo["TechLevel"];
};

export type InhabitedPlanetOptions = {
  seed: string;
  entityPath: string;
  starType: StarType;
  starHabitability: number;
  orbit: Orbit;
  name?: string;
  forcedTags?: readonly [WorldTag, WorldTag];
  allowedTemperatures?: readonly Planet["Temperature"][];
};

const completionCache = new Map<string, boolean>();

function tagsRequire(tags: readonly WorldTag[], tag: WorldTag): boolean {
  return tags.includes(tag);
}

function waterState(profile: Pick<PhysicalProfile, "Atmosphere" | "Temperature" | "BulkComposition">, tags: readonly WorldTag[]): boolean | undefined {
  const forcedDry = profile.Temperature === "Cryogenic" || profile.Temperature === "Volcanic" || profile.Atmosphere === "Vacuum" || tagsRequire(tags, "Desert World");
  const forcedWet = profile.BulkComposition === "Water" || tagsRequire(tags, "Oceanic World") || tagsRequire(tags, "Seagoing Cities");
  if (forcedDry && forcedWet) return undefined;
  if (forcedDry) return false;
  if (forcedWet) return true;
  return undefined;
}

function profileIsValid(profile: PhysicalProfile, tags: readonly WorldTag[], starHabitability: number): boolean {
  const environmentalHab = Math.min(
    ATMOSPHERE_HAB[profile.Atmosphere],
    TEMPERATURE_HAB[profile.Temperature],
    TERRAN_BIOSPHERE_HAB[profile.TerranBiosphere],
    SIZE_HAB[profile.Size],
    BULK_COMPOSITION_HAB[profile.BulkComposition],
  );
  const totalHab = Math.min(starHabitability, environmentalHab);
  if (totalHab < POPULATION_HAB_REQUIRED[profile.Population] || totalHab < TECH_HAB_REQUIRED[profile.TechLevel] || totalHab < TERRAN_BIOSPHERE_HAB_REQUIRED[profile.TerranBiosphere]) return false;
  if (waterState(profile, tags) === undefined && (tagsRequire(tags, "Desert World") || tagsRequire(tags, "Oceanic World") || tagsRequire(tags, "Seagoing Cities") || profile.BulkComposition === "Water" || profile.Temperature === "Cryogenic" || profile.Temperature === "Volcanic" || profile.Atmosphere === "Vacuum")) return false;
  if ((tagsRequire(tags, "Tomb World") || tagsRequire(tags, "Abandoned Colony")) && profile.Population !== "Fewer than 500") return false;
  if (tagsRequire(tags, "Outpost World") && profile.Population === "Billions of inhabitants") return false;
  if ((tagsRequire(tags, "Heavy Industry") || tagsRequire(tags, "Major Spaceyard") || tagsRequire(tags, "Post-Scarcity")) && TECH_LEVEL[profile.TechLevel] < 3) return false;

  for (const tag of tags) {
    const constraint = WORLD_TAG_CONSTRAINTS.get(tag);
    if (constraint === undefined) continue;
    const [populationMinimum, populationMaximum] = POPULATION_RANGE[profile.Population];
    if (constraint.maxEnvironmentalHab !== undefined && environmentalHab > constraint.maxEnvironmentalHab) return false;
    if (constraint.maxAtmospherePercentile !== undefined && ATMOSPHERE_MAX_PERCENTILE[profile.Atmosphere] > constraint.maxAtmospherePercentile) return false;
    if (constraint.minNativeBiospherePercentile !== undefined && NATIVE_BIOSPHERE_MIN_PERCENTILE[profile.NativeBiosphere] < constraint.minNativeBiospherePercentile) return false;
    if (constraint.minPopulationPercentile !== undefined && populationMinimum < constraint.minPopulationPercentile) return false;
    if (constraint.maxPopulationPercentile !== undefined && populationMaximum > constraint.maxPopulationPercentile) return false;
    if (constraint.minTechLevel !== undefined && TECH_LEVEL[profile.TechLevel] < constraint.minTechLevel) return false;
  }
  return true;
}

function hasCompletion(
  tags: readonly WorldTag[],
  starHabitability: number,
  allowedTemperatures: readonly Planet["Temperature"][],
  partial: Partial<PhysicalProfile>,
): boolean {
  const key = JSON.stringify([tags.slice().sort(), starHabitability, allowedTemperatures, partial]);
  const cached = completionCache.get(key);
  if (cached !== undefined) return cached;
  const atmospheres = partial.Atmosphere === undefined ? ATMOSPHERE_TABLE.map(row => row.Value) : [partial.Atmosphere];
  const temperatures = partial.Temperature === undefined ? allowedTemperatures : [partial.Temperature];
  const nativeBiospheres = partial.NativeBiosphere === undefined ? NATIVE_BIOSPHERE_TABLE.map(row => row.Value) : [partial.NativeBiosphere];
  const terranBiospheres = partial.TerranBiosphere === undefined ? TERRAN_BIOSPHERE_TABLE.map(row => row.Value) : [partial.TerranBiosphere];
  const sizes = partial.Size === undefined ? TERRESTRIAL_SIZE_TABLE.map(row => row.Value) : [partial.Size];
  const compositions = partial.BulkComposition === undefined ? BULK_COMPOSITION_TABLE.map(row => row.Value) : [partial.BulkComposition];
  const populations = partial.Population === undefined ? POPULATION_TABLE.map(row => row.Value) : [partial.Population];
  const techLevels = partial.TechLevel === undefined ? TECH_LEVEL_TABLE.map(row => row.Value) : [partial.TechLevel];

  for (const Atmosphere of atmospheres) for (const Temperature of temperatures) for (const NativeBiosphere of nativeBiospheres) for (const TerranBiosphere of terranBiospheres) for (const Size of sizes) for (const BulkComposition of compositions) for (const Population of populations) for (const TechLevel of techLevels) {
    if (profileIsValid({ Atmosphere, Temperature, NativeBiosphere, TerranBiosphere, Size, BulkComposition, Population, TechLevel }, tags, starHabitability)) {
      completionCache.set(key, true);
      return true;
    }
  }
  completionCache.set(key, false);
  return false;
}

function chooseFeasible<T extends string>(
  seed: string,
  path: string,
  rows: readonly { Value: T; Weight: number }[],
  tags: readonly WorldTag[],
  starHabitability: number,
  allowedTemperatures: readonly Planet["Temperature"][],
  partial: Partial<PhysicalProfile>,
  field: keyof PhysicalProfile,
): T {
  const candidates = rows.filter(row => hasCompletion(tags, starHabitability, allowedTemperatures, { ...partial, [field]: row.Value }));
  if (candidates.length === 0) throw new Error(`No feasible ${field} candidates for ${seed}:${path}`);
  return chooseWeighted(randomFor(seed, path), candidates, `${path} candidates`).Value;
}

/**
 * Tag constraints impose only upper/lower bounds, so their intersection can
 * be checked before selecting any physical attribute. The later completion
 * check still proves a concrete profile exists for every chosen value.
 */
function tagPairHasIntersection(tags: readonly WorldTag[]): boolean {
  if ((tagsRequire(tags, "Desert World")) && (tagsRequire(tags, "Oceanic World") || tagsRequire(tags, "Seagoing Cities"))) return false;
  let populationMinimum = 1;
  let populationMaximum = 100;
  for (const tag of tags) {
    const constraint = WORLD_TAG_CONSTRAINTS.get(tag);
    populationMinimum = Math.max(populationMinimum, constraint?.minPopulationPercentile ?? 1);
    populationMaximum = Math.min(populationMaximum, constraint?.maxPopulationPercentile ?? 100);
  }
  if (tagsRequire(tags, "Tomb World") || tagsRequire(tags, "Abandoned Colony") || tagsRequire(tags, "Outpost World")) populationMaximum = Math.min(populationMaximum, 9);
  return populationMinimum <= populationMaximum;
}

function selectTags(seed: string, path: string, starHabitability: number, allowedTemperatures: readonly Planet["Temperature"][], forcedTags?: readonly [WorldTag, WorldTag]): [WorldTag, WorldTag] {
  if (forcedTags !== undefined) {
    if (forcedTags[0] === forcedTags[1] || !tagPairHasIntersection(forcedTags) || !hasCompletion(forcedTags, starHabitability, allowedTemperatures, {})) throw new Error(`No feasible forced tag pair for ${seed}:${path}`);
    return [forcedTags[0], forcedTags[1]];
  }
  const pairs = WORLD_TAG_TABLE.flatMap(first => WORLD_TAG_TABLE
    .filter(second => first.Value !== second.Value && tagPairHasIntersection([first.Value, second.Value]) && hasCompletion([first.Value, second.Value], starHabitability, allowedTemperatures, {}))
    .map(second => ({ Value: [first.Value, second.Value] as [WorldTag, WorldTag], Weight: first.Weight * second.Weight })));
  if (pairs.length === 0) throw new Error(`No feasible world-tag pairs for ${seed}:${path}`);
  return chooseWeighted(randomFor(seed, `${path}:tags`), pairs, "world-tag pairs").Value;
}

export function generateInhabitedPlanet(options: InhabitedPlanetOptions): Planet {
  const allowedTemperatures = (options.allowedTemperatures ?? directOrbitTemperatures(options.starType)).filter(temperature => directOrbitTemperatures(options.starType).includes(temperature));
  if (allowedTemperatures.length === 0) throw new Error(`No direct-orbit temperatures for ${options.seed}:${options.entityPath}`);
  const tags = selectTags(options.seed, options.entityPath, options.starHabitability, allowedTemperatures, options.forcedTags);
  const partial: Partial<PhysicalProfile> = {};
  partial.Atmosphere = chooseFeasible(options.seed, `${options.entityPath}:atmosphere`, ATMOSPHERE_TABLE, tags, options.starHabitability, allowedTemperatures, partial, "Atmosphere");
  partial.Temperature = chooseFeasible(options.seed, `${options.entityPath}:temperature`, TEMPERATURE_TABLE.filter(row => allowedTemperatures.includes(row.Value)), tags, options.starHabitability, allowedTemperatures, partial, "Temperature");
  partial.NativeBiosphere = chooseFeasible(options.seed, `${options.entityPath}:native-biosphere`, NATIVE_BIOSPHERE_TABLE, tags, options.starHabitability, allowedTemperatures, partial, "NativeBiosphere");
  partial.TerranBiosphere = chooseFeasible(options.seed, `${options.entityPath}:terran-biosphere`, TERRAN_BIOSPHERE_TABLE, tags, options.starHabitability, allowedTemperatures, partial, "TerranBiosphere");
  partial.Size = chooseFeasible(options.seed, `${options.entityPath}:size`, TERRESTRIAL_SIZE_TABLE, tags, options.starHabitability, allowedTemperatures, partial, "Size");
  partial.BulkComposition = chooseFeasible(options.seed, `${options.entityPath}:composition`, BULK_COMPOSITION_TABLE, tags, options.starHabitability, allowedTemperatures, partial, "BulkComposition");
  partial.Population = chooseFeasible(options.seed, `${options.entityPath}:population`, POPULATION_TABLE, tags, options.starHabitability, allowedTemperatures, partial, "Population");
  partial.TechLevel = chooseFeasible(options.seed, `${options.entityPath}:technology`, TECH_LEVEL_TABLE, tags, options.starHabitability, allowedTemperatures, partial, "TechLevel");
  const profile = partial as PhysicalProfile;
  const forcedWater = waterState(profile, tags);
  const surfaceWater = forcedWater ?? randomFor(options.seed, `${options.entityPath}:water`)() >= .25;
  const totalHab = Math.min(options.starHabitability, ATMOSPHERE_HAB[profile.Atmosphere], TEMPERATURE_HAB[profile.Temperature], TERRAN_BIOSPHERE_HAB[profile.TerranBiosphere], SIZE_HAB[profile.Size], BULK_COMPOSITION_HAB[profile.BulkComposition]);
  const name = options.name ?? `Inhabited world ${options.entityPath}`;
  return {
    Id: deterministicId(options.seed, options.entityPath),
    ProceduralName: name,
    NiceName: name,
    VisibilityLevel: "NONE",
    Intelligence: { InfoboxSummary: `${profile.Population}; ${profile.TechLevel}.`, BasicScan: `${profile.Temperature}, ${profile.Atmosphere}.`, CulturePartial: tags.join("; "), CultureFull: "", GM: "" },
    Orbit: options.orbit,
    Temperature: profile.Temperature,
    Kind: "Planet",
    Size: profile.Size,
    BulkComposition: profile.BulkComposition,
    SurfaceWaterPresent: surfaceWater,
    TidallyLocked: options.orbit.ParentObjectId === null && options.starType === "M-type",
    Atmosphere: profile.Atmosphere,
    NativeBiosphere: profile.NativeBiosphere,
    InhabitedInfo: { TotalHab: totalHab, WorldTags: tags, TerranBiosphere: profile.TerranBiosphere, Population: profile.Population, TechLevel: profile.TechLevel },
  };
}
