import { describe, expect, it } from 'vitest';
import seedrandom from 'seedrandom';
import { build_super_export } from '../generators/supers/supers_impl';
import { default_build as buildDccStudents } from '../generators/dcc_students/dcc_students_impl';
import {
  abilityModifier,
  buildBlankDccCoreCharacter,
  buildDccCoreCharacter,
} from '../generators/dcc_core/dcc_core';
import {
  alignmentForXccGod,
  buildBlankXccCharacter,
  default_build as buildXcc,
  xccPortraitFileName,
  xccPortraitImagePath,
} from '../generators/xcc/xcc_impl';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { type ItemsNice, type ItemsRow, toItemsNice } from '../table_data/Items';
import rawItems from '../table_data/Items.json';

import { toProfession, type Profession, type ProfessionsRow } from '../table_data/Professions';
import rawProfessions from '../table_data/Professions.json';

import { toWeaponsNice, type WeaponsNice, type WeaponsRow } from '../table_data/Weapons';
import rawWeapons from '../table_data/Weapons.json';

import { luckyRowToNice, type LuckyRow } from '../table_data/Lucky';
import rawLucky from '../table_data/Lucky.json';

import type { XccCelebrityHeadshotsRow } from '../table_data/xcc_celebrity_headshots';
import rawXccHeadshots from '../table_data/xcc_celebrity_headshots.json';
import type { XccMovieNamesRow } from '../table_data/xcc_movie_names';
import rawXccMovieNames from '../table_data/xcc_movie_names.json';
import rawXccArmor from '../table_data/XCC_Armor.json';
import rawXccPacks from '../table_data/Starting_Adventurer_Packs.json';
import rawRaceNotes from '../table_data/RaceNotes.json';

const items: ItemsRow[] = rawItems;
const itemsNice: ItemsNice[] = items.map(toItemsNice);

const professions: ProfessionsRow[] = rawProfessions;
const studentProfessions = professions.filter((profession) => profession.Source === 'USSTUDENTS');
const xccOccupations: Profession[] = professions
  .map(toProfession)
  .filter((profession) => profession.Source === 'XCC');

const weapons: WeaponsRow[] = rawWeapons;
const weaponsNice: WeaponsNice[] = weapons.map(toWeaponsNice);

const lucky: LuckyRow[] = rawLucky;
const xccHeadshots: XccCelebrityHeadshotsRow[] = rawXccHeadshots;
const xccMovieNames: XccMovieNamesRow[] = rawXccMovieNames;

function nonEmpty(value: string): boolean {
  return value.trim() !== '';
}

describe('DCC profession data integrity', () => {
  it('all weapons referenced by professions exist in weapons', () => {
    const weaponNames = new Set(weaponsNice.map((w) => w.Weapon));

    const missingWeapons = studentProfessions
      .map((p) => p.Weapon)
      .filter(nonEmpty)
      .filter((weapon) => !weaponNames.has(weapon));

    expect(missingWeapons).toEqual([]);
  });

  it('all profession trade goods exist in items', () => {
    const itemNames = new Set(itemsNice.map((i) => i.Item));

    const missingTradeGoods = studentProfessions
      .map((p) => p.TradeGood)
      .filter(nonEmpty)
      .filter((tradeGood) => !itemNames.has(tradeGood));

    expect(missingTradeGoods).toEqual([]);
  });

  it('all weapons not assigned to a specific profession are random', () => {
    const professionWeapons = new Set(studentProfessions.map((p) => p.Weapon).filter(nonEmpty));

    const nonRandomUnassignedWeapons = weaponsNice
      .filter((w) => w.Source === 'USSTUDENTS')
      .filter((w) => !professionWeapons.has(w.Weapon))
      .filter((w) => !w.RandomPool)
      .map((w) => w.Weapon);

    expect(nonRandomUnassignedWeapons).toEqual([]);
  });

  it('all items not assigned to a specific profession are random', () => {
    const professionTradeGoods = new Set(
      studentProfessions.map((p) => p.TradeGood).filter(nonEmpty),
    );

    const nonRandomUnassignedItems = itemsNice
      .filter((i) => !professionTradeGoods.has(i.Item))
      .filter((i) => !i.Random)
      .map((i) => i.Item);

    expect(nonRandomUnassignedItems).toEqual([]);
  });
});

describe('XCC generic item data integrity', () => {
  const xccItems = itemsNice.filter((item) => item.Source === 'XCC');

  it('includes all XCC generic items as random Tools', () => {
    expect(xccItems).toHaveLength(18);
    expect(xccItems.every((item) => item.Category === 'Tool')).toBe(true);
    expect(xccItems.every((item) => item.Random)).toBe(true);
    expect(xccItems.every((item) => item.Genderlock === '')).toBe(true);
    expect(xccItems.map((item) => item.Item).sort()).toEqual(
      [
        'Chalk - 5 pieces',
        'Chest - empty',
        'Crowbar',
        'Flashlight - combat',
        'Flashlight - headset',
        'Flask - empty',
        'Grappling hook',
        'Hammer - small',
        'Iron spikes (5)',
        'Lighter - masterwork',
        'Mirror - hand-sized',
        'Notebook',
        'Oil - 3 flasks',
        'Pole - 10-foot',
        'Quiver',
        "Rope - 50'",
        'Sack (large)',
        'Sack (small)',
      ].sort(),
    );
  });
});

describe('XCC weapon data integrity', () => {
  const xccWeapons = weaponsNice.filter((weapon) => weapon.Source === 'XCC');

  it('contains the complete XCC weapon list', () => {
    expect(xccWeapons).toHaveLength(29);
  });

  it('uses only the five XCC default weapons in the random pool', () => {
    const randomPoolNames = xccWeapons
      .filter((weapon) => weapon.RandomPool)
      .map((weapon) => weapon.Weapon)
      .sort();

    expect(randomPoolNames).toEqual(['Club', 'Dagger', 'Rapier', 'Sling', 'Spear']);
  });

  it('stores range as zero or three slash-separated distances', () => {
    expect(
      xccWeapons.every((weapon) => weapon.Range === '0' || /^\d+\/\d+\/\d+$/.test(weapon.Range)),
    ).toBe(true);
  });

  it('stores XCC damage in dice notation', () => {
    expect(xccWeapons.every((weapon) => /^1d\d+$/.test(weapon.WeaponDamageBase))).toBe(true);
  });

  it('keeps dagger base damage separate from its backstab rule', () => {
    const dagger = xccWeapons.find((weapon) => weapon.Weapon === 'Dagger');

    expect(dagger?.WeaponDamageBase).toBe('1d4');
    expect(dagger?.CommaSeparatedSpecialProperties).toBe('Backstab,Hurl');
  });
});

describe('XCC character data integrity', () => {
  const armorNames = new Set(Object.keys(rawXccArmor));
  const packNames = new Set(Object.keys(rawXccPacks));
  const raceNames = new Set(Object.keys(rawRaceNotes));

  it('has complete occupation mappings', () => {
    expect(xccOccupations).toHaveLength(100);

    for (const occupation of xccOccupations) {
      expect(raceNames.has(occupation.Race)).toBe(true);
      expect(occupation.AdventurePack === '' || packNames.has(occupation.AdventurePack)).toBe(true);
      expect(Number.isFinite(occupation.StartingFunds)).toBe(true);
      expect(occupation.ArmorEquipped === 'None' || armorNames.has(occupation.ArmorEquipped)).toBe(
        true,
      );
    }

    for (const pack of Object.values(rawXccPacks)) {
      expect(Object.keys(pack)).toEqual(['otherEquipment']);
    }

    expect(rawXccPacks['Pack D'].otherEquipment).toContain('Shield');

    expect(
      xccOccupations.find((occupation) => occupation.ProfessionTitle === 'Half-orc-crawler'),
    ).toMatchObject({
      TradeGood: 'Battleaxe',
      ArmorEquipped: 'Chainmail',
    });
    expect(
      xccOccupations.find((occupation) => occupation.ProfessionTitle === 'Fitness instructor')
        ?.TradeGood,
    ).toBe('Healthy (+1 Stamina)');
    expect(
      xccOccupations.find((occupation) => occupation.ProfessionTitle === 'Hunter')?.TradeGood,
    ).toBe('longbow & quiver(24)');
  });

  it('builds a deterministic, populated XCC character', () => {
    const first = buildXcc('xcc-flow-check');
    const second = buildXcc('xcc-flow-check');

    expect(first.objects).toEqual(second.objects);
    expect(first.objects).toHaveLength(1);

    const character = first.objects[0];
    const occupation = xccOccupations.find(
      (candidate) => candidate.ProfessionTitle === character.professionTitle,
    );
    const portrait = xccHeadshots.find(
      (candidate) => candidate.NAME === character.portraitActorName,
    );

    expect(occupation).toBeDefined();
    expect(character).toMatchObject({
      race: occupation?.Race,
      professionPresentation: occupation?.XCCPresentation,
      gender: portrait?.GENDER,
      startingFunds: occupation?.StartingFunds,
      mojo: 0,
      fame: 0,
      wealth: 11,
      equipment: occupation?.AdventurePack,
      equipment2: '',
    });
    expect(character).toHaveProperty('armorName');
    expect(character).toHaveProperty('AC');
    expect(character).toHaveProperty('armorCheckPenalty');
    expect(character).toHaveProperty('armorSpeedPenalty');
    expect(character.armorFumbleDie).toMatch(/^d\d+$/);
    expect(character).not.toHaveProperty('armor');
    expect(character).not.toHaveProperty('armorClass');
    expect(character).not.toHaveProperty('shieldName');
    expect(character).not.toHaveProperty('shieldACBonus');
    const pack = occupation?.AdventurePack
      ? rawXccPacks[occupation.AdventurePack as keyof typeof rawXccPacks]
      : undefined;
    expect(character.packContents).toBe(pack?.otherEquipment.join(', ') ?? '');
    expect(character.firstName).not.toBe('');
    expect(character.lastName).not.toBe('');
    expect(character.racialTraits).toBe(
      rawRaceNotes[character.race as keyof typeof rawRaceNotes].racialTraits,
    );
    expect(character.languages).toContain(
      rawRaceNotes[character.race as keyof typeof rawRaceNotes].racialLanguage,
    );
    expect(character.languages).toContain('English');
    expect(character.portraitImagePath).toBe(portrait ? xccPortraitImagePath(portrait) : undefined);
    expect(xccMovieNames.map((movie) => movie.TITLE)).toContain(character.movieTitle);
    expect(['Lawful', 'Neutral', 'Chaotic']).toContain(character.alignment);
    expect(character.armorAC).toBeGreaterThanOrEqual(10);
    expect(character.hitPoints).toBeGreaterThanOrEqual(1);
    expect(
      weaponsNice.some(
        (weapon) =>
          weapon.Source === 'XCC' && weapon.RandomPool && weapon.Weapon === character.weaponDisplay,
      ),
    ).toBe(true);
    expect(
      lucky
        .map(luckyRowToNice)
        .some(
          (sign) =>
            sign.inXCC &&
            sign.XCCName === character.luckySignName &&
            sign.XCCWhen === character.luckySignWhen &&
            sign.XCCGod === character.luckySignGod,
        ),
    ).toBe(true);
  });

  it('generates valid relationships across a broad seed sample', () => {
    const portraitNames = new Set(xccHeadshots.map((row) => row.NAME));
    const occupationNames = new Set(xccOccupations.map((row) => row.ProfessionTitle));
    const occupationsByName = new Map(xccOccupations.map((row) => [row.ProfessionTitle, row]));

    for (let seed = 0; seed < 250; seed++) {
      const character = buildXcc(`xcc-sample-${seed}`).objects[0];
      const occupation = occupationsByName.get(character.professionTitle);
      const armorMappingName =
        occupation?.ArmorEquipped === 'None' ? 'Unarmored' : occupation?.ArmorEquipped;
      const armor = rawXccArmor[armorMappingName as keyof typeof rawXccArmor];

      expect(occupationNames.has(character.professionTitle)).toBe(true);
      expect(character.professionPresentation).toBe(occupation?.XCCPresentation);
      expect(raceNames.has(character.race)).toBe(true);
      expect(portraitNames.has(character.portraitActorName)).toBe(true);
      expect(character.portraitImagePath).toMatch(/\/xcc\/headshots\/[^/]+\.jpg$/);
      expect(character.portraitImagePath).not.toContain('image.tmdb.org');
      expect(xccMovieNames.map((movie) => movie.TITLE)).toContain(character.movieTitle);
      expect(character.strengthScore).toBeGreaterThanOrEqual(3);
      expect(character.strengthScore).toBeLessThanOrEqual(18);
      expect(character.equipment2).toBe('');
      expect(character.languages).toContain('English');
      expect(character.armorName).toBe(occupation?.ArmorEquipped);
      expect(character.armorAC).toBe(10 + armor.acBonus);
      expect(character.armorCheckPenalty).toBe(armor.checkPenalty);
      expect(character.armorSpeedPenalty).toBe(armor.speedPenalty);
      expect(character.armorFumbleDie).toBe(`d${armor.fumbleDie}`);
      expect(character.alignment).toBe(alignmentForXccGod(character.luckySignGod));

      expect(
        weaponsNice.some(
          (weapon) =>
            weapon.Source === 'XCC' &&
            weapon.RandomPool &&
            weapon.Weapon === character.weaponDisplay,
        ),
      ).toBe(true);
      expect(character).not.toHaveProperty('shieldName');
      expect(character).not.toHaveProperty('shieldACBonus');
    }
  });

  it('contains the complete XCrawl movie title table', () => {
    expect(xccMovieNames.map((movie) => movie.TITLE)).toEqual([
      'XCrawl 0: Origins',
      "XCrawl: Tyrant's Tale",
      'XCrawl II: Roundhouse',
      'XCrawl III: The Revenge',
      'XCrawl IV: Orclord',
      'XCrawl X: Overclocked',
      'XCrawl 2K: Endgame',
      'XCrawl Legacy',
      'XCrawl Redux',
      'XCrawl: Cry Harder',
    ]);
  });

  it('has a checked-in local image for every XCC headshot record', () => {
    for (const portrait of xccHeadshots) {
      const fileName = xccPortraitFileName(portrait);
      expect(
        existsSync(resolve('public', 'xcc', 'headshots', fileName)),
        `Missing local headshot for ${portrait.NAME}: ${fileName}`,
      ).toBe(true);
    }
  });
});

describe('Lucky sign variants', () => {
  it('retains the original 30 DCC lucky signs', () => {
    const dccSigns = lucky.map(luckyRowToNice).filter((sign) => sign.inDCC);

    expect(dccSigns).toHaveLength(30);
    expect(dccSigns).toContainEqual(
      expect.objectContaining({
        Tarot: 'The World',
        Speed: 5,
      }),
    );
  });

  it('includes all 24 XCC lucky signs', () => {
    const xccSigns = lucky.map(luckyRowToNice).filter((sign) => sign.inXCC);

    expect(xccSigns).toHaveLength(24);
    expect(xccSigns.every((sign) => nonEmpty(sign.XCCName))).toBe(true);
    expect(xccSigns.every((sign) => nonEmpty(sign.XCCWhen))).toBe(true);
    expect(xccSigns.every((sign) => nonEmpty(sign.XCCGod))).toBe(true);
    expect(xccSigns.every((sign) => !sign.XCCGod.startsWith('the '))).toBe(true);
    expect(xccSigns.every((sign) => !sign.XCCName.includes(' - '))).toBe(true);
    expect(xccSigns).toContainEqual(
      expect.objectContaining({
        XCCName: 'Taught by Diana',
        XCCWhen: 'Early April',
        XCCGod: 'Diana',
      }),
    );
    expect(xccSigns).toContainEqual(
      expect.objectContaining({
        XCCName: 'Chased by Faunus',
        Speed: 5,
      }),
    );
  });

  it('assigns every XCC boon god a deterministic alignment bias', () => {
    const gods = new Set(
      lucky
        .map(luckyRowToNice)
        .filter((sign) => sign.inXCC)
        .map((sign) => sign.XCCGod),
    );

    expect([...gods].map(alignmentForXccGod)).toEqual(
      expect.arrayContaining(['Lawful', 'Neutral', 'Chaotic']),
    );
  });
});

describe('DCC core', () => {
  it('uses the DCC ability modifier table', () => {
    expect([3, 4, 5, 6, 7, 8, 12, 13, 15, 16, 17, 18].map(abilityModifier)).toEqual([
      -3, -2, -2, -1, -1, 0, 0, 1, 1, 2, 2, 3,
    ]);
  });

  it('provides the common blank shape consumed by XCC', () => {
    const xccCharacter = buildBlankXccCharacter();

    expect(xccCharacter).toMatchObject(buildBlankDccCoreCharacter());
    expect(xccCharacter).toMatchObject({
      professionTitle: '',
      equipment: '',
      equipment2: '',
      equipment3: '',
      startingFunds: null,
      packContents: '',
      armorCheckPenalty: null,
      armorSpeedPenalty: null,
      armorFumbleDie: '',
      luckySignWhen: '',
      luckySignGod: '',
    });
    expect(xccCharacter).not.toHaveProperty('adventurerPack');
  });

  it('calculates AC from armor, Agility, and the lucky sign', () => {
    const character = buildDccCoreCharacter(seedrandom('armor-check'), {
      professionTitle: 'Test Profession',
      gender: 'Test Gender',
      race: 'Test Race',
      racialTraits: 'Test Trait',
      languages: 'Test Language',
      alignment: 'Neutral',
      armorName: 'Test Armor',
      armorAC: 14,
      equipment: 'Test Pack',
      equipment2: '',
      equipment3: 'Test Trade Good',
      startingFunds: 0,
      weapon: {
        displayName: 'Test Weapon',
        underlyingName: 'Test Weapon',
        damageBase: '1d4',
        weaponType: 'Melee',
        range: '10/20/30',
        specialProperties: 'Test Property',
      },
      rollLuckySign: () => ({
        name: 'Test Sign',
        description: 'Test Effect',
        meleeAttack: 0,
        rangedAttack: 0,
        meleeDamage: 0,
        rangedDamage: 0,
        fortitudeSave: 0,
        reflexSave: 0,
        willSave: 0,
        armorClass: 0,
        initiative: 0,
        hitPoints: 0,
        speed: 0,
      }),
    });

    expect(character.AC).toBe(14 + character.agilityMod);
    expect(character).toMatchObject({
      armorName: 'Test Armor',
      armorAC: 14,
      weaponRange: '10/20/30',
      weaponSpecialProperties: 'Test Property',
      professionTitle: 'Test Profession',
      gender: 'Test Gender',
      equipment: 'Test Pack',
      equipment2: '',
      equipment3: 'Test Trade Good',
      startingFunds: 0,
    });
  });

  it('uses Agility for melee weapons with the Agility property', () => {
    const character = buildDccCoreCharacter(seedrandom('agility-weapon'), {
      professionTitle: 'Test Profession',
      gender: 'Test Gender',
      race: 'Test Race',
      racialTraits: '',
      languages: 'English',
      alignment: 'Neutral',
      armorName: 'Unarmored',
      armorAC: 10,
      equipment: '',
      equipment2: '',
      equipment3: '',
      startingFunds: 0,
      weapon: {
        displayName: 'Rapier',
        underlyingName: 'Rapier',
        damageBase: '1d5',
        weaponType: 'Melee',
        range: '0',
        specialProperties: 'Agility',
      },
      rollLuckySign: () => ({
        name: 'Test Sign',
        description: '',
        meleeAttack: 0,
        rangedAttack: 0,
        meleeDamage: 0,
        rangedDamage: 0,
        fortitudeSave: 0,
        reflexSave: 0,
        willSave: 0,
        armorClass: 0,
        initiative: 0,
        hitPoints: 0,
        speed: 0,
      }),
    });

    expect(character.attackMod).toBe(character.agilityMod);
    expect(character.attackDamageMod).toBe(character.agilityMod);
  });
});

describe('DCC student seed compatibility', () => {
  it('preserves the established student roll sequence', () => {
    const output = buildDccStudents('refactor-check');

    expect(
      output.objects.map((character) => ({
        firstName: character.firstName,
        lastName: character.lastName,
        luckySignName: character.luckySignName,
        studentId: character.studentId,
        dob: character.dob_string,
        expiry: character.expiry_string,
      })),
    ).toEqual([
      {
        firstName: 'Karen',
        lastName: 'Obrien',
        luckySignName: 'The Lovers',
        studentId: '257',
        dob: '06/28/1969',
        expiry: '02/07/1987',
      },
      {
        firstName: 'Iris',
        lastName: 'Tanner',
        luckySignName: 'The Hierophant',
        studentId: '253',
        dob: '03/19/1969',
        expiry: '03/16/1987',
      },
      {
        firstName: 'Sergio',
        lastName: 'Strong',
        luckySignName: 'Temperance',
        studentId: '102',
        dob: '11/03/1969',
        expiry: '08/04/1987',
      },
      {
        firstName: 'Lara',
        lastName: 'Brennan',
        luckySignName: 'Queen of Cups',
        studentId: '193',
        dob: '02/01/1969',
        expiry: '05/06/1987',
      },
    ]);

    for (const character of output.objects) {
      expect(character).toMatchObject({
        race: 'Human',
        racialTraits: '',
        languages: 'English',
        armorName: 'None',
        armorAC: 10,
        alignment: 'Neutral',
      });

      const weapon = weaponsNice.find(
        (candidate) =>
          candidate.Source === 'USSTUDENTS' && candidate.Weapon === character.weaponDisplay,
      );
      expect(weapon).toBeDefined();
      expect(character.weaponRange).toBe(weapon?.Range);
      expect(character.weaponSpecialProperties).toBe(weapon?.CommaSeparatedSpecialProperties);

      expect(
        itemsNice.some((item) => item.Category === 'Tool' && item.Item === character.equipment),
      ).toBe(true);
      expect(
        itemsNice.some(
          (item) => item.Category === 'Cultural Goods' && item.Item === character.equipment2,
        ),
      ).toBe(true);

      const profession = studentProfessions.find(
        (candidate) => candidate.ProfessionTitle === character.professionTitle,
      );
      expect(profession).toBeDefined();
      expect(character.equipment3).toBe(profession?.TradeGood);
      expect(character.startingFunds).toBe(0);
    }
  });
});

describe('All UTs', () => {
  it('IATW Powers test', () => {
    let output = build_super_export('TEST', 200);
    console.debug(output);
    // expect(output[0][0]).toBe("Daichi");
    // expect(output[1][0]).toBe("Hiroshi");
    // expect(output[2][0]).toBe("Satoshi");
    // expect(output[0][1]).toBe("Mars");
    // expect(output[0][2]).toBe("grounded");
  });

  it('DCC Students test', () => {
    let output = buildDccStudents('TEST');
    console.debug(output);
    // expect(output[0][0]).toBe("Daichi");
    // expect(output[1][0]).toBe("Hiroshi");
    // expect(output[2][0]).toBe("Satoshi");
    // expect(output[0][1]).toBe("Mars");
    // expect(output[0][2]).toBe("grounded");
  });
});
