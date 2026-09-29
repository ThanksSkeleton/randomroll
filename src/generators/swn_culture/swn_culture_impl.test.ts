import { expect, test } from 'vitest';
import rawCultureData from '../../../swn_culture/swn_culture_data.json';
import rawNames from '../../table_data/names.json';
import { WORLD_TAG_DEFINITIONS, WORLD_TAG_TABLE } from '../swn_sector/Generator/generation_rules';
import type { WorldTag } from '../swn_sector/BaseDTO/merged_schema';
import {
  SWN_CULTURAL_TEMPLATES,
  SWN_PLACE_NAMES,
  generateSwnCulture,
  generateSwnCultureForTags,
} from './swn_culture_impl';

test('the same seed produces the same culture result', () => {
  expect(generateSwnCulture('repeatable')).toEqual(generateSwnCulture('repeatable'));
});

test('seed-only generation rolls two distinct filtered World Tags', () => {
  const allowedTags = new Set(WORLD_TAG_TABLE.map((row) => row.Value));
  for (let index = 0; index < 100; index += 1) {
    const result = generateSwnCulture(`tag-pair-${index}`);
    expect(result.worldTags[0]).not.toBe(result.worldTags[1]);
    expect(allowedTags.has(result.worldTags[0])).toBe(true);
    expect(allowedTags.has(result.worldTags[1])).toBe(true);
  }
});

test('supplying the rolled tags reproduces the same culture body', () => {
  const rolled = generateSwnCulture('replay');
  expect(generateSwnCultureForTags(rolled.worldTags, 'replay')).toEqual(rolled);
});

test('each adventure component contains one valid prompt from each tag', () => {
  const tags: [WorldTag, WorldTag] = ['Abandoned Colony', 'Alien Ruins'];
  const result = generateSwnCultureForTags(tags, 'component-prompts');
  const definitions = new Map(
    WORLD_TAG_DEFINITIONS.map((definition) => [definition.tag, definition]),
  );
  const components = [
    ['enemies', result.adventureComponents.enemy],
    ['friends', result.adventureComponents.friend],
    ['complications', result.adventureComponents.complication],
    ['things', result.adventureComponents.thing],
    ['places', result.adventureComponents.place],
  ] as const;

  for (const [category, component] of components) {
    expect(component.prompts.map((prompt) => prompt.sourceTag)).toEqual(tags);
    for (const prompt of component.prompts) {
      expect(definitions.get(prompt.sourceTag)?.prompts[category]).toContain(prompt.prompt);
    }
  }
});

test('culture and place names come directly from the SWN place-name CSV', () => {
  expect(SWN_CULTURAL_TEMPLATES).toHaveLength(10);
  expect([...SWN_PLACE_NAMES.values()].flat()).toHaveLength(500);
  const result = generateSwnCulture('place-names');
  const names = SWN_PLACE_NAMES.get(result.culturalTemplate);
  expect(names).toContain(result.homeworld);
  expect(names).toContain(result.adventureComponents.place.placeName);
  expect(names).toContain(result.majorStarport.name);
});

test('enemy and friend names use their rolled gender and cultural template', () => {
  const seenGenders = new Set<string>();
  for (let index = 0; index < 40; index += 1) {
    const result = generateSwnCulture(`personal-name-${index}`);
    for (const person of [result.adventureComponents.enemy, result.adventureComponents.friend]) {
      seenGenders.add(person.gender);
      const firstNames = rawNames.filter(
        (row) => row.Group === result.culturalTemplate && row.Type === person.gender,
      );
      const surnames = rawNames.filter(
        (row) => row.Group === result.culturalTemplate && row.Type === 'Surname',
      );
      expect(firstNames.some((row) => person.name.startsWith(`${row.Name} `))).toBe(true);
      expect(surnames.some((row) => person.name.endsWith(` ${row.Name}`))).toBe(true);
    }
  }
  expect(seenGenders).toEqual(new Set(['Male', 'Female']));
});

test('culture details are selected from the populated tables', () => {
  const diceResults = (table: { outcomes: Array<{ result: string }> }) =>
    table.outcomes.map((outcome) => outcome.result);
  for (let index = 0; index < 40; index += 1) {
    const result = generateSwnCulture(`culture-tables-${index}`);
    const reason = rawCultureData.pc_cares_about_reasons.find(
      (candidate) => candidate.result === result.pcCaresAbout.category,
    );
    expect(reason).toBeDefined();
    expect(rawCultureData[reason!.type_table as keyof typeof rawCultureData]).toContain(
      result.pcCaresAbout.type,
    );
    if (result.pcCaresAbout.category === 'Commodity') {
      expect(rawCultureData.commodity_sizes.map((entry) => entry.result)).toContain(
        result.pcCaresAbout.commoditySize,
      );
    } else {
      expect(result.pcCaresAbout.commoditySize).toBeNull();
    }
    const conflict = rawCultureData.biggest_conflicts.outcomes.find(
      (candidate) => candidate.result === result.biggestConflict.category,
    );
    expect(conflict).toBeDefined();
    expect(rawCultureData[conflict!.details_table as keyof typeof rawCultureData]).toContain(
      result.biggestConflict.details,
    );
    expect(diceResults(rawCultureData.law_enforcement_amounts)).toContain(
      result.lawEnforcement.amount,
    );
    expect(diceResults(rawCultureData.law_enforcement_styles)).toContain(
      result.lawEnforcement.style,
    );
    expect(diceResults(rawCultureData.special_laws)).toContain(result.lawEnforcement.specialLaw);
    expect(diceResults(rawCultureData.starport_types)).toContain(result.majorStarport.type);
    expect(diceResults(rawCultureData.orbiting_station_styles)).toContain(
      result.planetaryDefenses.orbitingStationStyle,
    );
    expect(diceResults(rawCultureData.orbiting_station_types)).toContain(
      result.planetaryDefenses.orbitingStationType,
    );
    expect(diceResults(rawCultureData.trade_and_smuggling_enforcement_amounts)).toContain(
      result.planetaryDefenses.tradeAndSmugglingEnforcementAmount,
    );
    expect(diceResults(rawCultureData.customs_and_visa_emphasis)).toContain(
      result.planetaryDefenses.customsAndVisaEmphasis,
    );
    expect(diceResults(rawCultureData.patrol_boat_presence)).toContain(
      result.planetaryDefenses.patrolBoatPresence,
    );
    expect(diceResults(rawCultureData.planetary_gun_turrets)).toContain(
      result.planetaryDefenses.planetaryGunTurrets,
    );
  }
});

test('commodity size uses the configured 25 percent Bulk and 75 percent Small roll', () => {
  expect(rawCultureData.commodity_sizes).toEqual([
    { result: 'Bulk', weight: 25 },
    { result: 'Small', weight: 75 },
  ]);
  expect(
    rawCultureData.commodity_types.every(
      (commodity) => !commodity.startsWith('Bulk:') && !commodity.startsWith('Bulk/Small:'),
    ),
  ).toBe(true);
});

test('biggest conflict uses the configured 2d6 ranges without Other Crisis', () => {
  expect(rawCultureData.biggest_conflicts).toEqual({
    dice: [6, 6],
    outcomes: [
      {
        min: 2,
        max: 3,
        result: 'Offworld Conflict',
        details_table: 'offworld_conflict_details',
      },
      {
        min: 4,
        max: 10,
        result: 'Class Conflict',
        details_table: 'class_conflict_details',
      },
      {
        min: 11,
        max: 12,
        result: 'Local War',
        details_table: 'local_war_details',
      },
    ],
  });
  expect(JSON.stringify(rawCultureData)).not.toContain('Other Crisis');
});

test('unavailable supplied tags are rejected at runtime', () => {
  expect(() =>
    generateSwnCultureForTags(['Primitive Aliens' as WorldTag, 'Alien Ruins'], 'invalid'),
  ).toThrow('Unknown or unavailable World Tag');
});
