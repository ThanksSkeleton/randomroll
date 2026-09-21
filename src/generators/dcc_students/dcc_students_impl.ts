import seedrandom from 'seedrandom';
import { autoflatten, random_multi, type ExportFormat } from '../../framework';
import { full_name } from '../../names_framework';
import {
  buildDccCoreCharacter,
  type DccCoreCharacter,
  type DccCoreLuckySign,
} from '../dcc_core/dcc_core';

import { luckyRowToNice, type LuckyNice, type LuckyRow } from '../../table_data/Lucky';
import rawLucky from '../../table_data/Lucky.json';
const lucky: LuckyRow[] = rawLucky;
// The shared table also contains XCC-only signs. Keep the student roll table—and
// therefore existing seeded results—restricted to its original DCC entries.
const luckyNice = lucky.map(luckyRowToNice).filter((sign) => sign.inDCC);

import { type ItemsNice, type ItemsRow, toItemsNice } from '../../table_data/Items';
import rawItems from '../../table_data/Items.json';
const items: ItemsRow[] = rawItems;
const itemsNice = items.map(toItemsNice);

import { type ProfessionsRow } from '../../table_data/Professions';
import rawProfessions from '../../table_data/Professions.json';
const professions: ProfessionsRow[] = rawProfessions;
const studentProfessions = professions.filter((profession) => profession.Source === 'USSTUDENTS');

import { toWeaponsNice, type WeaponsNice, type WeaponsRow } from '../../table_data/Weapons';
import rawWeapons from '../../table_data/Weapons.json';
const weapons: WeaponsRow[] = rawWeapons;
const weaponsNice = weapons.map(toWeaponsNice);

export type StudentCharacter = DccCoreCharacter & {
  firstName: string;
  lastName: string;

  studentStyle: string;
  gpa: string;
  age: number;
  bag: string;

  lunchContainer: string;
  lunchMain: string;
  lunchSide1: string;
  lunchSide2: string;
  lunchDrink: string;

  portraitImagePath: string;
  luckysignImagePath: string;
  schoolLogoImagePath: string;

  studentId: string;
  dob_string: string;
  expiry_string: string;
};

const MALE_FEMALE = ['Male', 'Female'];
const US_STYLE = 'US';
const DEFAULT_SCHOOL = "St. Cuthbert's Prepatory Academy";
const DEFAULT_PORTRAIT = 'Default Portrait';
const DEFAULT_LUCKYSIGN_IMAGE = 'DEFAULT';
const DEFAULT_AGE = 18;
const STUDENT_RACE = 'Human';
const STUDENT_RACIAL_TRAITS = '';
const STUDENT_LANGUAGES = 'English';
const STUDENT_ARMOR = 'None';
const STUDENT_ARMOR_AC = 10;
const STUDENT_ALIGNMENT = 'Neutral';

export function default_build(seed: string): ExportFormat<StudentCharacter> {
  const rng: seedrandom.PRNG = seedrandom(seed);
  const characters: StudentCharacter[] = [];

  for (let i = 0; i < 4; i++) {
    characters.push(buildDccStudent(rng, US_STYLE));
  }

  return autoflatten('Student DCC Characters', seed, characters);
}

function buildDccStudent(rng: seedrandom.PRNG, nationality: string): StudentCharacter {
  const gender = maleFemale(rng);
  const name = full_name(rng, gender, nationality);
  const profession = professionInfo(rng, gender);
  const core = buildDccCoreCharacter(rng, {
    professionTitle: profession.professionTitle.ProfessionTitle,
    gender,
    race: STUDENT_RACE,
    racialTraits: STUDENT_RACIAL_TRAITS,
    languages: STUDENT_LANGUAGES,
    alignment: STUDENT_ALIGNMENT,
    armorName: STUDENT_ARMOR,
    armorAC: STUDENT_ARMOR_AC,
    // Compatibility slots: tool, cultural item, then occupation trade good.
    equipment: profession.tool.Item,
    equipment2: profession.cultural_item.Item,
    equipment3: profession.tradeGood.Item,
    startingFunds: 0,
    weapon: {
      displayName: profession.weapon.Weapon,
      underlyingName: profession.weapon.WeaponUnderlying,
      damageBase: profession.weapon.WeaponDamageBase,
      weaponType: profession.weapon.WeaponType,
      range: profession.weapon.Range,
      specialProperties: profession.weapon.CommaSeparatedSpecialProperties,
    },
    rollLuckySign: rollStudentLuckySign,
  });

  const age = DEFAULT_AGE;
  const studentId = 100 + rng() * 200;
  const expiryString = randomDateInYear(rng, 1987);
  const dobString = randomDateInYear(rng, 1987 - age);

  // Keep this explicit construction order stable for existing flat exports.
  return {
    firstName: name[0],
    lastName: name[1],
    professionTitle: core.professionTitle,

    race: core.race,
    racialTraits: core.racialTraits,
    languages: core.languages,
    alignment: core.alignment,

    strengthScore: core.strengthScore,
    strengthMod: core.strengthMod,
    agilityScore: core.agilityScore,
    agilityMod: core.agilityMod,
    staminaScore: core.staminaScore,
    staminaMod: core.staminaMod,
    personalityScore: core.personalityScore,
    personalityMod: core.personalityMod,
    intelligenceScore: core.intelligenceScore,
    intelligenceMod: core.intelligenceMod,
    luckScore: core.luckScore,
    luckMod: core.luckMod,

    armorName: core.armorName,
    armorAC: core.armorAC,
    AC: core.AC,
    hitPoints: core.hitPoints,
    speed: core.speed,
    initiative: core.initiative,
    saveReflex: core.saveReflex,
    saveFort: core.saveFort,
    saveWill: core.saveWill,

    weaponDisplay: core.weaponDisplay,
    weaponUnderlying: core.weaponUnderlying,
    weaponDamageBase: core.weaponDamageBase,
    weaponType: core.weaponType,
    weaponRange: core.weaponRange,
    weaponSpecialProperties: core.weaponSpecialProperties,
    attackMod: core.attackMod,
    attackDamageMod: core.attackDamageMod,

    equipment: core.equipment,
    equipment2: core.equipment2,
    equipment3: core.equipment3,
    startingFunds: core.startingFunds,

    luckySignName: core.luckySignName,
    luckySignDescription: core.luckySignDescription,

    studentStyle: US_STYLE,
    portraitImagePath: DEFAULT_PORTRAIT,
    schoolLogoImagePath: DEFAULT_SCHOOL,
    luckysignImagePath: DEFAULT_LUCKYSIGN_IMAGE,

    gpa: Math.min(0.25 * core.intelligenceScore, 4.0).toFixed(1),
    age,
    gender: core.gender,

    bag: profession.bag.Item,
    lunchContainer: profession.lunchContainer,
    lunchMain: profession.lunchMain,
    lunchSide1: profession.lunchSide1,
    lunchSide2: profession.lunchSide2,
    lunchDrink: profession.lunchDrink,

    studentId: studentId.toFixed(0),
    dob_string: dobString,
    expiry_string: expiryString,
  };
}

function maleFemale(rng: seedrandom.PRNG): string {
  return MALE_FEMALE[Math.floor(rng() * MALE_FEMALE.length)];
}

type ProfessionInfo = {
  professionTitle: ProfessionsRow;
  weapon: WeaponsNice;
  bag: ItemsNice;
  wallet_item: ItemsNice;
  tradeGood: ItemsNice;
  tool: ItemsNice;
  cultural_item: ItemsNice;
  lunchContainer: string;
  lunchMain: string;
  lunchSide1: string;
  lunchSide2: string;
  lunchDrink: string;
};

function professionInfo(rng: seedrandom.PRNG, gender: string): ProfessionInfo {
  const genderProfessions = studentProfessions.filter(
    (profession) => profession.Genderlock === '' || profession.Genderlock === gender,
  );
  const profession = random_multi(rng, genderProfessions);

  const weapon =
    profession.Weapon !== ''
      ? weaponsNice.filter((candidate) => candidate.Weapon === profession.Weapon)[0]
      : random_multi(
          rng,
          weaponsNice.filter(
            (candidate) =>
              candidate.Source === 'USSTUDENTS' &&
              candidate.RandomPool &&
              (candidate.Genderlock === '' || candidate.Genderlock === gender),
          ),
        );

  const tradeGood = itemsNice.filter((item) => item.Item === profession.TradeGood)[0];
  if (tradeGood == null) {
    throw new Error(`Trade Good ${profession.TradeGood} not found`);
  }

  const rollableItems = itemsNice
    .filter((item) => item.Random)
    .filter((item) => item.Genderlock === '' || item.Genderlock === gender)
    .filter((item) => item.Item !== tradeGood.Item);
  const rollCategory = (category: string): ItemsNice =>
    random_multi(
      rng,
      rollableItems.filter((item) => item.Category === category),
    );

  const tool = rollCategory('Tool');
  const wallet = rollCategory('Wallet');
  const bag = rollCategory('Bag');
  const foodContainer = rollCategory('FoodContainer');
  const foodMain = rollCategory('FoodMain');
  const foodSide1 = rollCategory('FoodSide');
  const foodSide2 = rollCategory('FoodSide');
  const foodDrink = rollCategory('FoodDrink');
  const culturalItem = rollCategory('Cultural Goods');

  return {
    professionTitle: profession,
    weapon,
    bag,
    wallet_item: wallet,
    tradeGood,
    tool,
    cultural_item: culturalItem,
    lunchContainer: foodContainer.Item,
    lunchMain: foodMain.Item,
    lunchSide1: foodSide1.Item,
    lunchSide2: foodSide2.Item,
    lunchDrink: foodDrink.Item,
  };
}

function rollStudentLuckySign(rng: seedrandom.PRNG): DccCoreLuckySign {
  const sign: LuckyNice = random_multi(rng, luckyNice);

  return {
    name: sign.Tarot,
    description: sign.Description,
    meleeAttack: sign.Melee_Attack,
    rangedAttack: sign.Ranged_Attack,
    meleeDamage: sign.Melee_Damage,
    rangedDamage: sign.Ranged_Damage,
    fortitudeSave: sign.Fortitude_Save,
    reflexSave: sign.Reflex_Save,
    willSave: sign.Will_Save,
    armorClass: sign.AC,
    initiative: sign.Init,
    hitPoints: sign.HP,
    speed: sign.Speed,
  };
}

function randomDateInYear(rng: seedrandom.PRNG, year: number): string {
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const timestamp = start + Math.floor(rng() * (end - start));

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp));
}
