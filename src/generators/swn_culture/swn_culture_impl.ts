import seedrandom from 'seedrandom';
import { buildExportFormat, type ExportFormat } from '../../framework';
import { full_name } from '../../names_framework';
import rawCultureData from '../../../swn_culture/swn_culture_data.json';
import rawPlaceNamesCsv from '../../../temp/swn_place_names.csv?raw';
import {
  WORLD_TAG_DEFINITIONS,
  WORLD_TAG_TABLE,
  canonicalWorldTagPair,
  type WorldTagPromptCategory,
} from '../swn_sector/Generator/generation_rules';
import type { WorldTag } from '../swn_sector/BaseDTO/merged_schema';

type PcReasonTypeTable = 'commodity_types' | 'special_tech_types' | 'adventure_opportunity_types';
type ConflictDetailsTable =
  'class_conflict_details' | 'offworld_conflict_details' | 'local_war_details';
type DiceTable = {
  dice: number[];
  outcomes: Array<{ min: number; max: number; result: string }>;
};
type ConflictDiceTable = {
  dice: number[];
  outcomes: Array<{
    min: number;
    max: number;
    result: string;
    details_table: ConflictDetailsTable;
  }>;
};
type WeightedEntry = { result: string; weight: number };

type CultureData = {
  pc_cares_about_reasons: Array<{ result: string; type_table: PcReasonTypeTable }>;
  commodity_sizes: WeightedEntry[];
  commodity_types: string[];
  special_tech_types: string[];
  adventure_opportunity_types: string[];
  biggest_conflicts: ConflictDiceTable;
  class_conflict_details: string[];
  offworld_conflict_details: string[];
  local_war_details: string[];
  outsider_opinions: string[];
  law_enforcement_amounts: DiceTable;
  law_enforcement_styles: DiceTable;
  special_laws: DiceTable;
  starport_types: DiceTable;
  orbiting_station_styles: DiceTable;
  orbiting_station_types: DiceTable;
  trade_and_smuggling_enforcement_amounts: DiceTable;
  customs_and_visa_emphasis: DiceTable;
  patrol_boat_presence: DiceTable;
  planetary_gun_turrets: DiceTable;
};

import type {
  SwnCulture,
  SwnCultureGender,
  SwnCultureNamedComponent,
  SwnCulturePrompt,
} from '../swn_sector/BaseDTO/culture';

const cultureData = rawCultureData as CultureData;
const availableWorldTagSet = new Set<WorldTag>(WORLD_TAG_TABLE.map((row) => row.Value));
const worldTagDefinitionByName = new Map(
  WORLD_TAG_DEFINITIONS.map((definition) => [definition.tag, definition]),
);

export const SWN_PLACE_NAMES = parsePlaceNames(rawPlaceNamesCsv);
export const SWN_CULTURAL_TEMPLATES = [...SWN_PLACE_NAMES.keys()];

function parsePlaceNames(csv: string): Map<string, readonly string[]> {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.shift() !== 'NAME,CULTURE') throw new Error('Unexpected SWN place-name header');
  const names = new Map<string, string[]>();
  for (const [index, line] of lines.entries()) {
    const separator = line.lastIndexOf(',');
    if (separator < 0) throw new Error(`Malformed SWN place-name row ${index + 2}`);
    const name = line.slice(0, separator).trim();
    const culture = line.slice(separator + 1).trim();
    if (!name || !culture) throw new Error(`Incomplete SWN place-name row ${index + 2}`);
    const group = names.get(culture) ?? [];
    group.push(name);
    names.set(culture, group);
  }
  if (names.size === 0) throw new Error('SWN place-name table is empty');
  return names;
}

function choose<T>(rng: seedrandom.PRNG, values: readonly T[], tableName: string): T {
  if (values.length === 0) throw new Error(`Cannot roll on empty table ${tableName}`);
  return values[Math.floor(rng() * values.length)]!;
}

function chooseWeighted(
  rng: seedrandom.PRNG,
  values: readonly WeightedEntry[],
  tableName: string,
): string {
  const totalWeight = values.reduce((total, entry) => total + entry.weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0)
    throw new Error(`Cannot roll on empty or zero-weight table ${tableName}`);
  let roll = rng() * totalWeight;
  for (const entry of values) {
    if (!Number.isFinite(entry.weight) || entry.weight < 0)
      throw new Error(`Invalid weight in ${tableName}`);
    roll -= entry.weight;
    if (roll < 0) return entry.result;
  }
  return values[values.length - 1]!.result;
}

function rollDiceTable(rng: seedrandom.PRNG, table: DiceTable, tableName: string): string {
  return rollDiceOutcome(rng, table, tableName).result;
}

function rollDiceOutcome<TOutcome extends { min: number; max: number; result: string }>(
  rng: seedrandom.PRNG,
  table: { dice: number[]; outcomes: TOutcome[] },
  tableName: string,
): TOutcome {
  if (table.dice.length === 0) throw new Error(`No dice configured for ${tableName}`);
  const total = table.dice.reduce((sum, sides) => {
    if (!Number.isInteger(sides) || sides < 1) throw new Error(`Invalid die in ${tableName}`);
    return sum + Math.floor(rng() * sides) + 1;
  }, 0);
  const outcome = table.outcomes.find(
    (candidate) => total >= candidate.min && total <= candidate.max,
  );
  if (!outcome) throw new Error(`${tableName} has no outcome for roll ${total}`);
  return outcome;
}

function rollRandomWorldTags(seed: string): [WorldTag, WorldTag] {
  const rng = seedrandom(`${seed}:swn-culture:world-tags`);
  const first = choose(rng, WORLD_TAG_TABLE, 'filtered World Tags').Value;
  const second = choose(
    rng,
    WORLD_TAG_TABLE.filter((row) => row.Value !== first),
    'filtered World Tags excluding the first tag',
  ).Value;
  return canonicalWorldTagPair([first, second]);
}

function validateWorldTags(tags: readonly [WorldTag, WorldTag]): [WorldTag, WorldTag] {
  for (const tag of tags) {
    if (!availableWorldTagSet.has(tag)) throw new Error(`Unknown or unavailable World Tag: ${tag}`);
  }
  return canonicalWorldTagPair(tags);
}

function componentPrompts(
  rng: seedrandom.PRNG,
  worldTags: readonly [WorldTag, WorldTag],
  category: WorldTagPromptCategory,
): [SwnCulturePrompt, SwnCulturePrompt] {
  return worldTags.map((sourceTag) => {
    const definition = worldTagDefinitionByName.get(sourceTag);
    if (!definition) throw new Error(`Missing World Tag definition: ${sourceTag}`);
    return {
      prompt: choose(rng, definition.prompts[category], `${sourceTag}.${category}`),
      sourceTag,
    };
  }) as [SwnCulturePrompt, SwnCulturePrompt];
}

function namedComponent(
  rng: seedrandom.PRNG,
  culturalTemplate: string,
  prompts: [SwnCulturePrompt, SwnCulturePrompt],
): SwnCultureNamedComponent {
  const gender: SwnCultureGender = rng() < 0.5 ? 'Male' : 'Female';
  const [firstName, surname] = full_name(rng, gender, culturalTemplate);
  return { prompts, name: `${firstName} ${surname}`, gender };
}

export function generateSwnNpcLocationBank(
  culturalTemplate: string,
  seed: string,
): { npcs: Array<{ name: string; gender: SwnCultureGender }>; locations: string[] } {
  const rng = seedrandom(`${seed}:swn-culture:npc-location-bank`);
  const placeNames = SWN_PLACE_NAMES.get(culturalTemplate);
  if (!placeNames) throw new Error(`Missing place names for culture ${culturalTemplate}`);
  const npcs = Array.from({ length: 5 }, () => {
    const gender: SwnCultureGender = rng() < 0.5 ? 'Male' : 'Female';
    const [firstName, surname] = full_name(rng, gender, culturalTemplate);
    return { name: `${firstName} ${surname}`, gender };
  });
  const locations = Array.from({ length: 5 }, () =>
    choose(rng, placeNames, `${culturalTemplate} place names`),
  );
  return { npcs, locations };
}

/** Generates one culture, including a random pair of distinct filtered World Tags. */
export function generateSwnCulture(seed: string): SwnCulture {
  return generateSwnCultureForTags(rollRandomWorldTags(seed), seed);
}

/** Generates one culture from a caller-supplied pair of filtered World Tags. */
export function generateSwnCultureForTags(
  worldTagsInput: readonly [WorldTag, WorldTag],
  seed: string,
): SwnCulture {
  const worldTags = validateWorldTags(worldTagsInput);
  const rng = seedrandom(`${seed}:swn-culture:body`);
  const culturalTemplate = choose(rng, SWN_CULTURAL_TEMPLATES, 'cultural templates');
  const placeNames = SWN_PLACE_NAMES.get(culturalTemplate);
  if (!placeNames) throw new Error(`Missing place names for culture ${culturalTemplate}`);

  const enemy = namedComponent(rng, culturalTemplate, componentPrompts(rng, worldTags, 'enemies'));
  const friend = namedComponent(rng, culturalTemplate, componentPrompts(rng, worldTags, 'friends'));
  const complication = { prompts: componentPrompts(rng, worldTags, 'complications') };
  const thing = { prompts: componentPrompts(rng, worldTags, 'things') };
  const place = {
    prompts: componentPrompts(rng, worldTags, 'places'),
    placeName: choose(rng, placeNames, `${culturalTemplate} place names`),
  };

  const pcReason = choose(rng, cultureData.pc_cares_about_reasons, 'PC care-about reasons');
  const conflict = rollDiceOutcome(rng, cultureData.biggest_conflicts, 'biggest conflicts');

  return {
    worldTags,
    culturalTemplate,
    homeworld: choose(rng, placeNames, `${culturalTemplate} place names`),
    adventureComponents: { enemy, friend, complication, thing, place },
    pcCaresAbout: {
      category: pcReason.result,
      type: choose(rng, cultureData[pcReason.type_table], pcReason.type_table),
      commoditySize:
        pcReason.result === 'Commodity'
          ? chooseWeighted(rng, cultureData.commodity_sizes, 'commodity sizes')
          : null,
    },
    biggestConflict: {
      category: conflict.result,
      details: choose(rng, cultureData[conflict.details_table], conflict.details_table),
    },
    outsiderOpinion: choose(rng, cultureData.outsider_opinions, 'outsider opinions'),
    lawEnforcement: {
      amount: rollDiceTable(rng, cultureData.law_enforcement_amounts, 'law enforcement amounts'),
      style: rollDiceTable(rng, cultureData.law_enforcement_styles, 'law enforcement styles'),
      specialLaw: rollDiceTable(rng, cultureData.special_laws, 'special laws'),
    },
    majorStarport: {
      type: rollDiceTable(rng, cultureData.starport_types, 'starport types'),
      name: choose(rng, placeNames, `${culturalTemplate} place names`),
    },
    planetaryDefenses: {
      orbitingStationStyle: rollDiceTable(
        rng,
        cultureData.orbiting_station_styles,
        'orbiting station styles',
      ),
      orbitingStationType: rollDiceTable(
        rng,
        cultureData.orbiting_station_types,
        'orbiting station types',
      ),
      tradeAndSmugglingEnforcementAmount: rollDiceTable(
        rng,
        cultureData.trade_and_smuggling_enforcement_amounts,
        'trade and smuggling enforcement amounts',
      ),
      customsAndVisaEmphasis: rollDiceTable(
        rng,
        cultureData.customs_and_visa_emphasis,
        'customs and visa emphasis',
      ),
      patrolBoatPresence: rollDiceTable(
        rng,
        cultureData.patrol_boat_presence,
        'patrol boat presence',
      ),
      planetaryGunTurrets: rollDiceTable(
        rng,
        cultureData.planetary_gun_turrets,
        'planetary gun turrets',
      ),
    },
  };
}

export function default_build(seed: string): ExportFormat<SwnCulture> {
  const culture = generateSwnCulture(seed);
  const columns = Object.keys(culture) as Array<keyof SwnCulture>;
  const flattened = columns.map((column) => {
    const value = culture[column];
    return typeof value === 'string' ? value : JSON.stringify(value);
  });
  return buildExportFormat('SWN World Culture', seed, columns, [flattened], [culture]);
}
