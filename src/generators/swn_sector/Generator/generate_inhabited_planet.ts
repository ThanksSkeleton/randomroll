import type { InhabitedInfo, StarType, Temperature, WorldTag } from '../BaseDTO/merged_schema';
import type { GeneratedOrbit as Orbit, GeneratedPlanet as Planet } from './generation_model';
import { deterministicId, chooseWeighted, randomFor } from './generation_random';
import {
  BULK_COMPOSITION_TABLE,
  NATIVE_BIOSPHERE_TABLE,
  POPULATION_TABLE,
  SURFACE_WATER_PRESENT_TABLE,
  TECH_LEVEL_TABLE,
  TEMPERATURE_TABLE,
  TERRAN_BIOSPHERE_TABLE,
  SIZE_TABLE,
  WORLD_TAG_TABLE,
} from './generation_rules';
import { directOrbitTemperatures } from '../Shared/spatial_interpretation';
import {
  ATMOSPHERE_RANK,
  POPULATION_HAB_REQUIRED,
  TECH_HAB_REQUIRED,
  TERRAN_BIOSPHERE_HAB_REQUIRED,
} from './data_tables';
import {
  BULK_COMPOSITION_HAB,
  SIZE_HAB,
  TEMPERATURE_HAB,
  TERRAN_BIOSPHERE_HAB,
} from '../Shared/planet_interpretation';
import { WORLD_TAG_CONSTRAINTS } from './generation_constraints';
import { generateAtmosphere } from './generate_atmosphere';
import { resolveAtmosphere } from '../Shared/atmosphere_interpretation';

type PhysicalProfile = {
  Atmosphere: Planet['Atmosphere'];
  Temperature: Temperature;
  NativeBiosphere: Planet['NativeBiosphere'];
  TerranBiosphere: InhabitedInfo['TerranBiosphere'];
  Size: Planet['Size'];
  BulkComposition: Planet['BulkComposition'];
  Population: InhabitedInfo['Population'];
  TechLevel: InhabitedInfo['TechLevel'];
};

export type InhabitedPlanetOptions = {
  seed: string;
  entityPath: string;
  starType: StarType;
  starHabitability: number;
  orbit: Orbit;
  name?: string;
  forcedTags?: readonly [WorldTag, WorldTag];
  allowedTemperatures?: readonly Temperature[];
};

const MAX_PROFILE_ROLLS = 100;
const TOMB_WORLD_MIN_TECH_LEVEL = 4;

function tagsRequire(tags: readonly WorldTag[], tag: WorldTag): boolean {
  return tags.includes(tag);
}

function maximumPopulationRankForTags(tags: readonly WorldTag[]): number {
  return tags.reduce(
    (maximum, tag) =>
      Math.min(maximum, WORLD_TAG_CONSTRAINTS.get(tag)?.maxPopulationRank ?? 5),
    5,
  );
}

function chooseWithinHab<T extends string | number>(
  seed: string,
  path: string,
  rows: readonly { Value: T; Weight: number }[],
  habRequired: Readonly<Record<T, number>>,
  currentHab: number,
  context: string,
): T {
  const candidates = rows.filter((row) => habRequired[row.Value] <= currentHab);
  return chooseWeighted(randomFor(seed, path), candidates, context).Value;
}

function waterState(
  profile: Pick<PhysicalProfile, 'Atmosphere' | 'Temperature' | 'BulkComposition'>,
  tags: readonly WorldTag[],
): boolean | undefined {
  const forcedDry =
    profile.Temperature === 'Cryogenic' ||
    profile.Temperature === 'Furance' ||
    profile.Atmosphere.Category === 'Vacuum' ||
    tagsRequire(tags, 'Desert World');
  const forcedWet =
    profile.BulkComposition === 'Water' ||
    tagsRequire(tags, 'Oceanic World') ||
    tagsRequire(tags, 'Seagoing Cities');
  if (forcedDry && forcedWet) return undefined;
  if (forcedDry) return false;
  if (forcedWet) return true;
  return undefined;
}

function profileInvalidReason(
  profile: PhysicalProfile,
  tags: readonly WorldTag[],
  starHabitability: number,
): string | undefined {
  const environmentalHab = Math.min(
    resolveAtmosphere(profile.Atmosphere).HabRating,
    TEMPERATURE_HAB[profile.Temperature],
    TERRAN_BIOSPHERE_HAB[profile.TerranBiosphere],
    SIZE_HAB[profile.Size],
    BULK_COMPOSITION_HAB[profile.BulkComposition],
  );
  const totalHab = Math.min(starHabitability, environmentalHab);
  if (
    totalHab < POPULATION_HAB_REQUIRED[profile.Population] ||
    totalHab < TECH_HAB_REQUIRED[profile.TechLevel] ||
    totalHab < TERRAN_BIOSPHERE_HAB_REQUIRED[profile.TerranBiosphere]
  )
    return 'habitability is below the rolled population, technology, or Terran-biosphere requirement';
  if (
    waterState(profile, tags) === undefined &&
    (tagsRequire(tags, 'Desert World') ||
      tagsRequire(tags, 'Oceanic World') ||
      tagsRequire(tags, 'Seagoing Cities') ||
      profile.BulkComposition === 'Water' ||
      profile.Temperature === 'Cryogenic' ||
      profile.Temperature === 'Furance' ||
      profile.Atmosphere.Category === 'Vacuum')
  )
    return 'the rolled temperature/atmosphere requires dry conditions while the tags or composition require water';
  for (const tag of tags) {
    const constraint = WORLD_TAG_CONSTRAINTS.get(tag);
    if (constraint === undefined) continue;
    if (
      constraint.maxEnvironmentalHab !== undefined &&
      environmentalHab > constraint.maxEnvironmentalHab
    )
      return `${tag} caps environmental habitability`;
    if (
      constraint.maxAtmosphereRank !== undefined &&
      ATMOSPHERE_RANK[profile.Atmosphere.Category] > constraint.maxAtmosphereRank
    )
      return `${tag} requires atmosphere rank ${constraint.maxAtmosphereRank} or lower`;
    if (
      constraint.minNativeBiosphereRank !== undefined &&
      profile.NativeBiosphere < constraint.minNativeBiosphereRank
    )
      return `${tag} requires native biosphere rank ${constraint.minNativeBiosphereRank} or higher`;
    if (
      constraint.minPopulationRank !== undefined &&
      profile.Population < constraint.minPopulationRank
    )
      return `${tag} requires population rank ${constraint.minPopulationRank} or higher`;
    if (
      constraint.maxPopulationRank !== undefined &&
      profile.Population > constraint.maxPopulationRank
    )
      return `${tag} requires population rank ${constraint.maxPopulationRank} or lower`;
    if (constraint.minTechLevel !== undefined && profile.TechLevel < constraint.minTechLevel)
      return `${tag} requires a higher technology level`;
  }
  return undefined;
}

/** Reject contradictions that are apparent from tags and available temperatures alone. */
function tagPairHasIntersection(
  tags: readonly WorldTag[],
  starHabitability?: number,
  allowedTemperatures?: readonly Temperature[],
): boolean {
  if (
    tagsRequire(tags, 'Desert World') &&
    (tagsRequire(tags, 'Oceanic World') || tagsRequire(tags, 'Seagoing Cities'))
  )
    return false;
  if (
    allowedTemperatures?.every(
      (temperature) => temperature === 'Cryogenic' || temperature === 'Furance',
    ) &&
    (tagsRequire(tags, 'Oceanic World') || tagsRequire(tags, 'Seagoing Cities'))
  )
    return false;
  let minimumPopulationRank = 1;
  for (const tag of tags) {
    const constraint = WORLD_TAG_CONSTRAINTS.get(tag);
    minimumPopulationRank = Math.max(minimumPopulationRank, constraint?.minPopulationRank ?? 1);
  }
  let maximumPopulationRank = maximumPopulationRankForTags(tags);
  if (starHabitability !== undefined) {
    const maximumSupportedPopulationRank = POPULATION_TABLE.filter(
      (row) => POPULATION_HAB_REQUIRED[row.Value] <= starHabitability,
    ).reduce((maximum, row) => Math.max(maximum, row.Value), 0);
    maximumPopulationRank = Math.min(maximumPopulationRank, maximumSupportedPopulationRank);
  }
  return minimumPopulationRank <= maximumPopulationRank;
}

function maximumEnvironmentalHabForTags(tags: readonly WorldTag[]): number {
  return tags.reduce(
    (maximum, tag) =>
      Math.min(maximum, WORLD_TAG_CONSTRAINTS.get(tag)?.maxEnvironmentalHab ?? Infinity),
    Infinity,
  );
}

function selectTags(
  seed: string,
  path: string,
  starHabitability: number,
  allowedTemperatures: readonly Temperature[],
  forcedTags?: readonly [WorldTag, WorldTag],
): [WorldTag, WorldTag] {
  if (forcedTags !== undefined) {
    if (
      forcedTags[0] === forcedTags[1] ||
      !tagPairHasIntersection(forcedTags, starHabitability, allowedTemperatures)
    )
      throw new Error(`No feasible forced tag pair for ${seed}:${path}`);
    return [forcedTags[0], forcedTags[1]];
  }
  const pairs = WORLD_TAG_TABLE.flatMap((first) =>
    WORLD_TAG_TABLE.filter(
      (second) =>
        first.Value !== second.Value &&
        tagPairHasIntersection([first.Value, second.Value], starHabitability, allowedTemperatures),
    ).map((second) => ({
      Value: [first.Value, second.Value] as [WorldTag, WorldTag],
      Weight: first.Weight * second.Weight,
    })),
  );
  if (pairs.length === 0) throw new Error(`No feasible world-tag pairs for ${seed}:${path}`);
  return chooseWeighted(randomFor(seed, `${path}:tags`), pairs, 'world-tag pairs').Value;
}

export function generateInhabitedPlanet(options: InhabitedPlanetOptions): Planet {
  const allowedTemperatures = (
    options.allowedTemperatures ?? directOrbitTemperatures(options.starType)
  ).filter((temperature) => directOrbitTemperatures(options.starType).includes(temperature));
  if (allowedTemperatures.length === 0)
    throw new Error(`No direct-orbit temperatures for ${options.seed}:${options.entityPath}`);
  const tags = selectTags(
    options.seed,
    options.entityPath,
    options.starHabitability,
    allowedTemperatures,
    options.forcedTags,
  );
  const isTombWorld = tagsRequire(tags, 'Tomb World');
  let profile: PhysicalProfile | undefined;
  let profilePath: string | undefined;
  let lastProfile: PhysicalProfile | undefined;
  const rejectionCounts = new Map<string, number>();
  for (let attempt = 0; attempt < MAX_PROFILE_ROLLS; attempt += 1) {
    const path = `${options.entityPath}:profile:${attempt}`;
    const Atmosphere = generateAtmosphere(options.seed, path);
    const Temperature = chooseWeighted(
      randomFor(options.seed, `${path}:temperature`),
      TEMPERATURE_TABLE.filter((row) => allowedTemperatures.includes(row.Value)),
      'temperatures',
    ).Value;
    let currentHab = Math.min(
      options.starHabitability,
      resolveAtmosphere(Atmosphere).HabRating,
      TEMPERATURE_HAB[Temperature],
    );
    const NativeBiosphere = chooseWeighted(
      randomFor(options.seed, `${path}:native-biosphere`),
      NATIVE_BIOSPHERE_TABLE,
      'native biospheres',
    ).Value;
    const TerranBiosphere = chooseWithinHab(
      options.seed,
      `${path}:terran-biosphere`,
      TERRAN_BIOSPHERE_TABLE,
      TERRAN_BIOSPHERE_HAB_REQUIRED,
      currentHab,
      'Terran biospheres',
    );
    currentHab = Math.min(currentHab, TERRAN_BIOSPHERE_HAB[TerranBiosphere]);
    const Size = chooseWeighted(
      randomFor(options.seed, `${path}:size`),
      SIZE_TABLE.filter((row) => SIZE_HAB[row.Value] > 0),
      'sizes',
    ).Value;
    currentHab = Math.min(currentHab, SIZE_HAB[Size]);
    const environmentalHabBeforeComposition = Math.min(
      resolveAtmosphere(Atmosphere).HabRating,
      TEMPERATURE_HAB[Temperature],
      TERRAN_BIOSPHERE_HAB[TerranBiosphere],
      SIZE_HAB[Size],
    );
    const maximumEnvironmentalHab = maximumEnvironmentalHabForTags(tags);
    const compositionRows =
      isTombWorld && environmentalHabBeforeComposition > maximumEnvironmentalHab
        ? BULK_COMPOSITION_TABLE.filter(
            (row) => BULK_COMPOSITION_HAB[row.Value] <= maximumEnvironmentalHab,
          )
        : BULK_COMPOSITION_TABLE;
    const BulkComposition = chooseWeighted(
      randomFor(options.seed, `${path}:composition`),
      compositionRows,
      'bulk compositions',
    ).Value;
    currentHab = Math.min(currentHab, BULK_COMPOSITION_HAB[BulkComposition]);
    const populationRows = isTombWorld
      ? POPULATION_TABLE.filter(
          (row) => row.Value <= maximumPopulationRankForTags(tags),
        )
      : POPULATION_TABLE;
    const technologyRows = isTombWorld
      ? TECH_LEVEL_TABLE.filter((row) => row.Value >= TOMB_WORLD_MIN_TECH_LEVEL)
      : TECH_LEVEL_TABLE;
    const candidate: PhysicalProfile = {
      Atmosphere,
      Temperature,
      NativeBiosphere,
      TerranBiosphere,
      Size,
      BulkComposition,
      Population: chooseWithinHab(
        options.seed,
        `${path}:population`,
        populationRows,
        POPULATION_HAB_REQUIRED,
        currentHab,
        'populations',
      ),
      TechLevel: isTombWorld
        ? chooseWithinHab(
            options.seed,
            `${path}:technology`,
            technologyRows,
            TECH_HAB_REQUIRED,
            currentHab,
            'Tomb World technology levels',
          )
        : chooseWeighted(
            randomFor(options.seed, `${path}:technology`),
            technologyRows,
            'technology levels',
          ).Value,
    };
    const rejectionReason = profileInvalidReason(candidate, tags, options.starHabitability);
    if (rejectionReason === undefined) {
      profile = candidate;
      profilePath = path;
      break;
    }
    lastProfile = candidate;
    rejectionCounts.set(rejectionReason, (rejectionCounts.get(rejectionReason) ?? 0) + 1);
  }
  if (profile === undefined || profilePath === undefined) {
    const rejections = Array.from(rejectionCounts, ([reason, count]) => `${count} ${reason}`).join(
      '; ',
    );
    throw new Error(
      `No valid inhabited profile after ${MAX_PROFILE_ROLLS} rolls for ${options.seed}:${options.entityPath}; tags=${JSON.stringify(tags)}; lastProfile=${JSON.stringify(lastProfile)}; rejections=${rejections}`,
    );
  }
  const forcedWater = waterState(profile, tags);
  const surfaceWater =
    forcedWater ??
    chooseWeighted(
      randomFor(options.seed, `${profilePath}:water`),
      SURFACE_WATER_PRESENT_TABLE,
      'surface water presence',
    ).Value;
  const name = options.name ?? `Inhabited world ${options.entityPath}`;
  return {
    Id: deterministicId(options.seed, options.entityPath),
    ProceduralName: name,
    NiceName: name,
    Visibility: {
      BasicScan: false,
      DetailedScan: false,
      PoliticsScan: false,
      DeepPoliticsScan: false,
    },
    Intelligence: {
      InfoboxSummary: '-',
      BasicScan: '-',
      DetailedScan: '-',
      PoliticsScan: '-',
      DeepPoliticsScan: '-',
      GM: '-',
    },
    Orbit: options.orbit,
    Temperature: profile.Temperature,
    Kind: 'Planet',
    Size: profile.Size,
    BulkComposition: profile.BulkComposition,
    SurfaceWaterPresent: surfaceWater,
    Atmosphere: profile.Atmosphere,
    NativeBiosphere: profile.NativeBiosphere,
    ClaimedByPolityIds: [],
    InhabitedInfo: {
      WorldTags: tags,
      TerranBiosphere: profile.TerranBiosphere,
      Population: profile.Population,
      TechLevel: profile.TechLevel,
    },
  };
}
