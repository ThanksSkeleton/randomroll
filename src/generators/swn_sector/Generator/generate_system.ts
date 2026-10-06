import type {
  HexLocation,
  PointOfInterest,
  PointOfInterestType,
  StarType,
} from '../BaseDTO/merged_schema';
import type {
  GeneratedOtherCelestialObject as OtherCelestialObject,
  GeneratedPlanet as Planet,
  GeneratedStarSystem as StarSystem,
  GeneratedSystemObject as SystemObject,
} from './generation_model';
import { canonicalSystem } from './generation_model';
import {
  choose,
  chooseWeighted,
  deterministicId,
  randomFor,
  rollDie,
  shuffled,
} from './generation_random';
import type { GenerationSettings } from './generation_settings';
import { GAS_GIANT_MOON_TABLE, POI_DETAIL_COLUMNS_BY_TYPE, POI_TABLE } from './generation_rules';
import { isPoiHostCompatible } from '../Shared/poi_host_interpretation';
import {
  directOrbitAuBand,
  directOrbitAuRange,
  temperatureForDirectOrbitAu,
} from '../Shared/spatial_interpretation';
import { assignPortraitIndex } from './portrait_selection';
import { generateInhabitedPlanet } from './generate_inhabited_planet';
import { applySystemNiceNames, lowercaseRomanNumeral } from './system_naming';
import {
  generateTemplateOtherCelestialObject,
  generateTemplatePlanet,
  templateHasUsableTemperature,
  type ExtraPlanetTemplate,
  type OtherCelestialObjectTemplate,
} from './planet_templates';

/** Assign distinct open-interval AU values without changing any physical fact. */
export function assignDirectOrbitAus(
  generationSettings: GenerationSettings,
  entityPath: string,
  starType: StarType,
  objects: readonly SystemObject[],
): SystemObject[] {
  const directObjects = objects.filter((object) => object.Orbit.ParentObjectId === null);
  const auById = new Map<string, number>();
  const groups = new Map<SystemObject['Temperature'], SystemObject[]>();
  for (const object of directObjects) {
    const group = groups.get(object.Temperature) ?? [];
    group.push(object);
    groups.set(object.Temperature, group);
  }
  for (const [temperature, group] of groups) {
    const [minimum, maximum] = directOrbitAuBand(starType, temperature);
    if (maximum <= minimum)
      throw new Error(
        `No direct-orbit AU interval for ${generationSettings.seed}:${entityPath}:${temperature}`,
      );
    const ordered = shuffled(
      randomFor(generationSettings, `${entityPath}:au:${temperature}`),
      group,
    );
    const width = (maximum - minimum) / ordered.length;
    ordered.forEach((object, index) => {
      const random = randomFor(generationSettings, `${entityPath}:au:${temperature}:${object.Id}`);
      auById.set(
        object.Id,
        sampleOpenRange(random, minimum + width * index, minimum + width * (index + 1)),
      );
    });
  }
  return objects
    .map((object) => {
      if (object.Orbit.ParentObjectId !== null) return object;
      return { ...object, Orbit: { ...object.Orbit, AU: auById.get(object.Id)! } };
    })
    .sort(
      (left, right) =>
        left.Orbit.AU - right.Orbit.AU || (left.Orbit.ParentObjectId === null ? -1 : 1),
    );
}

function sampleOpenRange(random: () => number, minimum: number, maximum: number): number {
  const unit = Math.min(1 - Number.EPSILON, Math.max(Number.EPSILON, random()));
  return minimum + (maximum - minimum) * unit;
}

function directObjectAuRange(starType: StarType, object: SystemObject): readonly [number, number] {
  if (
    object.Kind === 'OtherCelestialObject' &&
    (object.ObjectType === 'KuiperBelt' || object.ObjectType === 'GasCloud')
  )
    return directOrbitAuBand(starType, 'Cryogenic');
  return directOrbitAuRange(starType);
}

function deriveNonInhabitedPlanetFacts(planet: Planet): Planet {
  const surfaceWaterPresent =
    planet.BulkComposition === 'Water' &&
    planet.Temperature !== 'Cryogenic' &&
    planet.Temperature !== 'Furance' &&
    planet.Atmosphere.Category !== 'Vacuum';
  return {
    ...planet,
    SurfaceWaterPresent: surfaceWaterPresent,
  };
}

/** Places non-inhabited direct objects uniformly, then derives their temperature from AU. */
export function assignUniformDirectOrbitAus(
  generationSettings: GenerationSettings,
  entityPath: string,
  starType: StarType,
  objects: readonly SystemObject[],
  occupiedAus: readonly number[] = [],
): SystemObject[] {
  const occupied = new Set(occupiedAus);
  return objects.map((object) => {
    if (object.Orbit.ParentObjectId !== null) return object;
    const [minimum, maximum] = directObjectAuRange(starType, object);
    if (maximum <= minimum)
      throw new Error(
        `No direct-orbit AU interval for ${generationSettings.seed}:${entityPath}:${object.Id}`,
      );
    const random = randomFor(generationSettings, `${entityPath}:au:${object.Id}`);
    let au = sampleOpenRange(random, minimum, maximum);
    while (occupied.has(au)) au = sampleOpenRange(random, minimum, maximum);
    occupied.add(au);
    const temperature = temperatureForDirectOrbitAu(starType, au);
    const placed = {
      ...object,
      Temperature: temperature,
      Orbit: { ...object.Orbit, AU: au },
    };
    return placed.Kind === 'Planet' && placed.InhabitedInfo === false
      ? deriveNonInhabitedPlanetFacts(placed)
      : placed;
  });
}

export type GenerateSystemOptions = {
  generationSettings: GenerationSettings;
  entityPath: string;
  hexLocation: HexLocation;
  starType: StarType;
  starHabitability: number;
  inhabited?: boolean;
};

const EXTRA_TEMPLATES: readonly ExtraPlanetTemplate[] = [
  'Mercurian',
  'Europan / Plutonic',
  'Lunar',
  'Ioan',
  'Titanian',
  'Martian',
  'Venusian',
  'Jovian',
  'Neptunian',
];
type ExtraObjectCategory = 'Planet' | OtherCelestialObjectTemplate;
export const EXTRA_OBJECT_TYPE_WEIGHTS: readonly { Value: ExtraObjectCategory; Weight: number }[] =
  [
    { Value: 'Planet', Weight: 60 },
    { Value: 'AsteroidBelt', Weight: 20 },
    { Value: 'GasCloud', Weight: 10 },
    { Value: 'KuiperBelt', Weight: 10 },
  ];
const ONE_INHABITED_WORLD_MAX_ROLL = 85;
export const MAX_SYSTEM_GENERATION_RETRIES = 5;

const SYSTEM_NAME_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomSystemName(generationSettings: GenerationSettings, entityPath: string): string {
  const random = randomFor(generationSettings, `${entityPath}:system-name`);
  return Array.from({ length: 5 }, () => SYSTEM_NAME_ALPHABET[Math.floor(random() * 26)]).join('');
}

function hexCoordinatePart(value: number): string {
  return value.toString().padStart(2, '0');
}

function applyGeneratedNames(
  generationSettings: GenerationSettings,
  entityPath: string,
  system: StarSystem,
): StarSystem {
  const niceName = randomSystemName(generationSettings, entityPath);
  const proceduralName = `${hexCoordinatePart(system.HexLocation.Column)}${hexCoordinatePart(system.HexLocation.Row)}`;
  const named = applySystemNiceNames(system, niceName);
  const directObjects = system.Objects.filter((object) => object.Orbit.ParentObjectId === null);
  const letters = new Map(
    directObjects.map((object, index) => [object.Id, String.fromCharCode(65 + index)]),
  );
  const moonIndexes = new Map<string, number>();
  const objects = named.Objects.map((object) => {
    const parentId = object.Orbit.ParentObjectId;
    if (parentId !== null && object.Kind === 'Planet') {
      const index = moonIndexes.get(parentId) ?? 0;
      moonIndexes.set(parentId, index + 1);
      const suffix = `${letters.get(parentId)}${String.fromCharCode(97 + index)}`;
      return { ...object, ProceduralName: `${proceduralName} ${suffix}` };
    }
    const suffix = `${object.Kind === 'Planet' ? '' : 'X '}${letters.get(object.Id)}`;
    return { ...object, ProceduralName: `${proceduralName} ${suffix}` };
  });
  const poiIndexesByParent = new Map<string, number>();
  const pointsOfInterest = named.PointsOfInterest.map((poi) => {
    const parent = objects.find((object) => object.Id === poi.ParentObjectId)!;
    const ordinal = (poiIndexesByParent.get(parent.Id) ?? 0) + 1;
    poiIndexesByParent.set(parent.Id, ordinal);
    const numeral = lowercaseRomanNumeral(ordinal);
    return { ...poi, ProceduralName: `${parent.ProceduralName}${numeral}:${poi.POIType}` };
  });
  return {
    ...named,
    ProceduralName: proceduralName,
    Star: {
      ...named.Star,
      ProceduralName: `${proceduralName} star`,
    },
    Objects: objects,
    PointsOfInterest: pointsOfInterest,
    HabitablePointsOfInterest: [],
  };
}

function inhabitedCount(generationSettings: GenerationSettings, path: string): number {
  const roll = rollDie(randomFor(generationSettings, `${path}:inhabited-count`), 100);
  return roll <= ONE_INHABITED_WORLD_MAX_ROLL ? 1 : 2;
}

/**
 * Runs a system-generation action once plus up to five retries. Each retry has
 * its own deterministic random stream, so a seed remains reproducible.
 */
export function retrySystemGeneration<T>(
  generationSettings: GenerationSettings,
  entityPath: string,
  generateAttempt: (attemptSettings: GenerationSettings) => T,
): T {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_SYSTEM_GENERATION_RETRIES; attempt += 1) {
    const attemptSettings =
      attempt === 0
        ? generationSettings
        : {
            ...generationSettings,
            seed: `${generationSettings.seed}:${entityPath}:generation-retry:${String(attempt)}`,
          };
    try {
      return generateAttempt(attemptSettings);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_SYSTEM_GENERATION_RETRIES) break;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `System generation failed for ${generationSettings.seed}:${entityPath} (attempt ${attempt + 1}/${MAX_SYSTEM_GENERATION_RETRIES + 1}): ${message}. Retrying.`,
      );
    }
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Unable to generate system ${generationSettings.seed}:${entityPath} after ${MAX_SYSTEM_GENERATION_RETRIES + 1} attempts: ${message}`,
  );
}

/** Builds physical system objects only; POIs are added by the next construction slice. */
function generateSystemOnce(options: GenerateSystemOptions): StarSystem {
  const name = `System ${options.entityPath}`;
  const objects: SystemObject[] = [];
  const pendingMoons: Array<{ worldPath: string; parentId: string }> = [];
  const count =
    options.inhabited === false
      ? 0
      : inhabitedCount(options.generationSettings, options.entityPath);
  for (let index = 0; index < count; index += 1) {
    const worldPath = `${options.entityPath}:inhabited:${String(index + 1).padStart(2, '0')}`;
    const isMoon = chooseWeighted(
      randomFor(options.generationSettings, `${worldPath}:moon`),
      GAS_GIANT_MOON_TABLE,
      'gas giant moon',
    ).Value;
    if (!isMoon) {
      objects.push(
        generateInhabitedPlanet({
          generationSettings: options.generationSettings,
          entityPath: worldPath,
          starType: options.starType,
          starHabitability: options.starHabitability,
          orbit: {
            AU: 0,
            AngleDegrees: randomFor(options.generationSettings, `${worldPath}:angle`)() * 360,
            ParentObjectId: null,
          },
        }),
      );
      continue;
    }
    const parentPath = `${worldPath}:parent`;
    const parent = generateTemplatePlanet({
      generationSettings: options.generationSettings,
      entityPath: parentPath,
      starType: options.starType,
      template: 'Jovian',
      temperature: 'Cryogenic',
      orbit: {
        AU: 0,
        AngleDegrees: randomFor(options.generationSettings, `${parentPath}:angle`)() * 360,
        ParentObjectId: null,
      },
    });
    objects.push(parent);
    pendingMoons.push({ worldPath, parentId: parent.Id });
  }
  const extraTarget = Math.min(
    5 - count,
    rollDie(randomFor(options.generationSettings, `${options.entityPath}:extra-count`), 3) + 1,
  );
  // A gas-giant parent of an inhabited moon is itself an extra object. Moons
  // live outside `objects` until final assembly, so include them here when
  // keeping the total object count within five.
  while (objects.length + pendingMoons.length - count < extraTarget) {
    const index = objects.length + 1;
    const path = `${options.entityPath}:extra:${String(index).padStart(2, '0')}`;
    const category = chooseWeighted(
      randomFor(options.generationSettings, `${path}:category`),
      EXTRA_OBJECT_TYPE_WEIGHTS,
      'extra-object categories',
    ).Value;
    const orbit = {
      AU: 0,
      AngleDegrees: randomFor(options.generationSettings, `${path}:angle`)() * 360,
      ParentObjectId: null,
    };
    if (category === 'Planet') {
      const templates = EXTRA_TEMPLATES.filter((template) =>
        templateHasUsableTemperature(template, options.starType),
      );
      objects.push(
        generateTemplatePlanet({
          generationSettings: options.generationSettings,
          entityPath: path,
          starType: options.starType,
          template: choose(
            randomFor(options.generationSettings, `${path}:template`),
            templates,
            'extra-world templates',
          ),
          temperature: 'Cryogenic',
          orbit,
        }),
      );
    } else {
      objects.push(
        generateTemplateOtherCelestialObject({
          generationSettings: options.generationSettings,
          entityPath: path,
          starType: options.starType,
          template: category,
          temperature: 'Cryogenic',
          orbit,
        }),
      );
    }
  }
  const inhabitedDirect = objects.filter(
    (object): object is Planet =>
      object.Kind === 'Planet' &&
      object.InhabitedInfo !== false &&
      object.Orbit.ParentObjectId === null,
  );
  const nonInhabitedDirect = objects.filter(
    (object) =>
      object.Orbit.ParentObjectId === null &&
      !(object.Kind === 'Planet' && object.InhabitedInfo !== false),
  );
  const placedInhabited = assignDirectOrbitAus(
    options.generationSettings,
    options.entityPath,
    options.starType,
    inhabitedDirect,
  );
  const placedOther = assignUniformDirectOrbitAus(
    options.generationSettings,
    options.entityPath,
    options.starType,
    nonInhabitedDirect,
    placedInhabited.map((object) => object.Orbit.AU),
  );
  const placedById = new Map(
    [...placedInhabited, ...placedOther].map((object) => [object.Id, object]),
  );
  const placed = objects.map((object) => placedById.get(object.Id) ?? object);
  for (const pendingMoon of pendingMoons) {
    const parent = placedById.get(pendingMoon.parentId);
    if (parent === undefined || parent.Kind !== 'Planet')
      throw new Error(
        `Missing moon parent for ${options.generationSettings.seed}:${pendingMoon.worldPath}`,
      );
    placed.push(
      generateInhabitedPlanet({
        generationSettings: options.generationSettings,
        entityPath: pendingMoon.worldPath,
        starType: options.starType,
        starHabitability: options.starHabitability,
        allowedTemperatures: [parent.Temperature],
        orbit: {
          AU: parent.Orbit.AU,
          AngleDegrees:
            randomFor(options.generationSettings, `${pendingMoon.worldPath}:angle`)() * 360,
          ParentObjectId: parent.Id,
        },
      }),
    );
  }
  return {
    Id: deterministicId(options.generationSettings, options.entityPath),
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
    HexLocation: options.hexLocation,
    Star: {
      Id: deterministicId(options.generationSettings, `${options.entityPath}:star`),
      ProceduralName: `${name} star`,
      NiceName: `${name} star`,
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
      StarType: options.starType,
      PortraitIndex: assignPortraitIndex(
        options.generationSettings,
        deterministicId(options.generationSettings, `${options.entityPath}:star`),
      ),
    },
    Objects: placed.sort(
      (left, right) =>
        left.Orbit.AU - right.Orbit.AU || (left.Orbit.ParentObjectId === null ? -1 : 1),
    ),
    PointsOfInterest: [],
    HabitablePointsOfInterest: [],
  };
}

/** Builds a system, retrying failed random draws with bounded deterministic attempts. */
export function generateSystem(options: GenerateSystemOptions): StarSystem {
  const system = retrySystemGeneration(
    options.generationSettings,
    options.entityPath,
    (attemptSettings) => generateSystemOnce({ ...options, generationSettings: attemptSettings }),
  );
  return applyGeneratedNames(options.generationSettings, options.entityPath, system);
}

/** Builds the complete system output, including POIs, under one retry budget. */
export function generateCompleteSystem(
  options: GenerateSystemOptions,
): import('../BaseDTO/merged_schema').StarSystem {
  const system = retrySystemGeneration(
    options.generationSettings,
    options.entityPath,
    (attemptSettings) => {
      const attemptOptions = { ...options, generationSettings: attemptSettings };
      return populatePointsOfInterest(
        attemptSettings,
        options.entityPath,
        generateSystemOnce(attemptOptions),
      );
    },
  );
  return canonicalSystem(
    applyGeneratedNames(options.generationSettings, options.entityPath, system),
  );
}

function rollPoiDetail(
  generationSettings: GenerationSettings,
  path: string,
  column: {
    key: string;
    label: string;
    entries: Array<{ roll: string; result: string }>;
  },
): string {
  const ranges = column.entries.map((entry) => {
    const match = /^(\d+)(?:-(\d+))?$/.exec(entry.roll);
    if (match === null) throw new Error(`Invalid ${column.key} roll range ${entry.roll}`);
    const first = Number(match[1]);
    const last = Number(match[2] ?? match[1]);
    if (first < 1 || last < first)
      throw new Error(`Invalid ${column.key} roll range ${entry.roll}`);
    return { entry, first, last };
  });
  const dieSides = Math.max(...ranges.map((range) => range.last));
  const roll = rollDie(randomFor(generationSettings, `${path}:detail:${column.key}`), dieSides);
  const selected = ranges.find((range) => roll >= range.first && roll <= range.last);
  if (selected === undefined) {
    throw new Error(`No ${column.key} result for roll ${roll} on ${path}`);
  }
  return `${column.label}: ${selected.entry.result}`;
}

function makePoi(
  generationSettings: GenerationSettings,
  path: string,
  parentObjectId: string,
  type: PointOfInterestType,
): PointOfInterest {
  const temporaryNumber =
    Math.floor(randomFor(generationSettings, `${path}:temporary-name`)() * 9000) + 1000;
  const temporaryName = `${temporaryNumber}-TEMP`;
  const generatedDetails =
    (POI_DETAIL_COLUMNS_BY_TYPE[type] ?? [])
      .map((column) => rollPoiDetail(generationSettings, path, column))
      .join('\n') || '-';
  return {
    Id: deterministicId(generationSettings, path),
    ProceduralName: temporaryName,
    NiceName: temporaryName,
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
      GM: generatedDetails,
    },
    ParentObjectId: parentObjectId,
    POIType: type,
    AngleDegrees: randomFor(generationSettings, `${path}:angle`)() * 360,
    PortraitIndex: assignPortraitIndex(
      generationSettings,
      deterministicId(generationSettings, path),
    ),
  };
}

/** Adds only constructively feasible POIs; it never generates and repairs an invalid host. */
export function populatePointsOfInterest(
  generationSettings: GenerationSettings,
  entityPath: string,
  system: StarSystem,
): StarSystem {
  const target = rollDie(randomFor(generationSettings, `${entityPath}:poi-count`), 4) + 1;
  const objects = [...system.Objects];
  const pois: PointOfInterest[] = [];
  const capacity = new Map<string, number>();
  for (let index = 0; index < target; index += 1) {
    const eligible = POI_TABLE.filter((row) => row.Value !== 'Deep-space station').flatMap((row) =>
      objects
        .filter(
          (object) =>
            (capacity.get(object.Id) ?? 0) < 3 &&
            isPoiHostCompatible(row.Value, object) &&
            !(object.Kind === 'Planet' && object.InhabitedInfo !== false) &&
            !objects.some(
              (candidate) =>
                candidate.Orbit.ParentObjectId === object.Id &&
                candidate.Kind === 'Planet' &&
                candidate.InhabitedInfo !== false,
            ),
        )
        .map((object) => ({ Value: { type: row.Value, host: object }, Weight: row.Weight })),
    );
    const canCreateStation = objects.length < 5;
    const candidates = canCreateStation
      ? [
          ...eligible,
          { Value: { type: 'Deep-space station' as const, host: undefined }, Weight: 1 },
        ]
      : eligible;
    if (candidates.length === 0) {
      const hostSummary = objects
        .map(
          (object) =>
            `${object.Kind === 'Planet' ? (object.InhabitedInfo === false ? 'uninhabited planet' : 'inhabited planet') : object.ObjectType}:${capacity.get(object.Id) ?? 0}`,
        )
        .join(', ');
      throw new Error(
        `No feasible POI candidates for ${generationSettings.seed}:${entityPath}:${index}; objects=${objects.length}; eligible=${eligible.length}; hosts=[${hostSummary}]`,
      );
    }
    const selected = chooseWeighted(
      randomFor(generationSettings, `${entityPath}:poi:${index}`),
      candidates,
      'POI candidates',
    ).Value;
    if (selected.type === 'Deep-space station') {
      const stationPath = `${entityPath}:station:${index}`;
      const station: OtherCelestialObject = {
        Id: deterministicId(generationSettings, stationPath),
        ProceduralName: `Independent station ${stationPath}`,
        NiceName: `Independent station ${stationPath}`,
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
        Kind: 'OtherCelestialObject',
        ObjectType: 'IndependentStation',
        PortraitIndex: assignPortraitIndex(
          generationSettings,
          deterministicId(generationSettings, stationPath),
        ),
        // The final temperature is derived from the uniformly selected AU.
        Temperature: 'Cryogenic',
        ClaimedByPolityIds: [],
        Orbit: {
          AU: 0,
          AngleDegrees: randomFor(generationSettings, `${stationPath}:angle`)() * 360,
          ParentObjectId: null,
        },
      };
      const existingDirectAus = objects
        .filter((object) => object.Orbit.ParentObjectId === null)
        .map((object) => object.Orbit.AU);
      const [placedStation] = assignUniformDirectOrbitAus(
        generationSettings,
        stationPath,
        system.Star.StarType,
        [station],
        existingDirectAus,
      );
      if (placedStation === undefined || placedStation.Kind !== 'OtherCelestialObject')
        throw new Error(`Missing station ${stationPath}`);
      if (!isPoiHostCompatible(selected.type, placedStation))
        throw new Error(`Generated station cannot host ${selected.type}`);
      objects.push(placedStation);
      pois.push(
        makePoi(generationSettings, `${entityPath}:poi:${index}`, placedStation.Id, selected.type),
      );
      capacity.set(placedStation.Id, 1);
      continue;
    }
    pois.push(
      makePoi(generationSettings, `${entityPath}:poi:${index}`, selected.host.Id, selected.type),
    );
    capacity.set(selected.host.Id, (capacity.get(selected.host.Id) ?? 0) + 1);
  }
  return {
    ...system,
    Objects: objects
      .map((object) => {
        if (object.Orbit.ParentObjectId === null) return object;
        const parent = objects.find((candidate) => candidate.Id === object.Orbit.ParentObjectId);
        if (parent === undefined)
          throw new Error(`Missing moon parent for ${generationSettings.seed}:${object.Id}`);
        const placed = {
          ...object,
          Temperature: parent.Temperature,
          Orbit: { ...object.Orbit, AU: parent.Orbit.AU },
        };
        return placed;
      })
      .sort(
        (left, right) =>
          left.Orbit.AU - right.Orbit.AU || (left.Orbit.ParentObjectId === null ? -1 : 1),
      ),
    PointsOfInterest: pois,
    HabitablePointsOfInterest: [],
  };
}
