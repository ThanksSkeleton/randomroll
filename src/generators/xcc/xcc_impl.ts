import seedrandom from 'seedrandom';
import { autoflatten, random_multi, type ExportFormat } from '../../framework';
import { full_name } from '../../names_framework';
import { type ItemsNice, type ItemsRow, toItemsNice } from '../../table_data/Items';
import rawItems from '../../table_data/Items.json';
import { luckyRowToNice, type LuckyNice, type LuckyRow } from '../../table_data/Lucky';
import rawLucky from '../../table_data/Lucky.json';
import rawRaceNotes from '../../table_data/RaceNotes.json';
import rawArmor from '../../table_data/XCC_Armor.json';
import rawPacks from '../../table_data/Starting_Adventurer_Packs.json';
import { toProfession, type Profession, type ProfessionsRow } from '../../table_data/Professions';
import rawProfessions from '../../table_data/Professions.json';
import { toWeaponsNice, type WeaponsNice, type WeaponsRow } from '../../table_data/Weapons';
import rawWeapons from '../../table_data/Weapons.json';
import type { XccCelebrityHeadshotsRow } from '../../table_data/xcc_celebrity_headshots';
import rawHeadshots from '../../table_data/xcc_celebrity_headshots.json';
import type { XccMovieNamesRow } from '../../table_data/xcc_movie_names';
import rawMovieNames from '../../table_data/xcc_movie_names.json';
import {
  buildBlankDccCoreCharacter,
  buildDccCoreCharacter,
  type BlankDccCoreCharacter,
  type DccCoreCharacter,
  type DccCoreLuckySign,
  type DccCoreWeapon,
} from '../dcc_core/dcc_core';

type RaceNote = {
  racialTraits: string;
  racialLanguage: string;
  baseSpeed: number;
};

type Armor = {
  acBonus: number;
  checkPenalty: number;
  speedPenalty: number;
  fumbleDie: number;
  cost: string;
};

type AdventurerPack = {
  otherEquipment: string[];
};

type XccLuckySign = DccCoreLuckySign & {
  when: string;
  god: string;
};

const raceNotes = rawRaceNotes as Record<string, RaceNote>;
const armorByName = rawArmor as Record<string, Armor>;
const packsByName = rawPacks as Record<string, AdventurerPack>;

const occupations = (rawProfessions as ProfessionsRow[])
  .map(toProfession)
  .filter((profession) => profession.Source === 'XCC');
const headshots = rawHeadshots as XccCelebrityHeadshotsRow[];
const movieNames = rawMovieNames as XccMovieNamesRow[];
const xccItems: ItemsNice[] = (rawItems as ItemsRow[])
  .map(toItemsNice)
  .filter((item) => item.Source === 'XCC' && item.Random);
const xccWeapons: WeaponsNice[] = (rawWeapons as WeaponsRow[])
  .map(toWeaponsNice)
  .filter((weapon) => weapon.Source === 'XCC');
const xccLuckySigns: LuckyNice[] = (rawLucky as LuckyRow[])
  .map(luckyRowToNice)
  .filter((sign) => sign.inXCC);

const GENDERS = ['Male', 'Female'] as const;
const XCC_GOD_ALIGNMENTS = {
  Apollo: 'Chaotic',
  Bacchus: 'Chaotic',
  Ceres: 'Neutral',
  Cupid: 'Chaotic',
  Diana: 'Lawful',
  Discordia: 'Chaotic',
  Faunus: 'Chaotic',
  Fortuna: 'Chaotic',
  Hercules: 'Chaotic',
  Hesta: 'Lawful',
  Juno: 'Lawful',
  Jupiter: 'Lawful',
  Mars: 'Chaotic',
  Mercury: 'Lawful',
  Minerva: 'Lawful',
  Neptune: 'Chaotic',
  Pluto: 'Neutral',
  Sol: 'Lawful',
  'The Furaie': 'Lawful',
  'The Kharites': 'Neutral',
  'The Mora': 'Chaotic',
  Trivia: 'Neutral',
  Vulcan: 'Lawful',
} as const;
const NAME_GROUP = 'US';
const BASE_ARMOR_CLASS = 10;
const DEFAULT_MOJO = 0;
const DEFAULT_FAME = 0;
const DEFAULT_WEALTH = 11;
const EXTRA_GEAR = 'extra piece of gear';
const XCC_HEADSHOT_DIRECTORY = 'xcc/headshots/';

export type XccCharacter = DccCoreCharacter & {
  firstName: string;
  lastName: string;
  professionPresentation: string;
  armorCheckPenalty: number;
  armorSpeedPenalty: number;
  armorFumbleDie: string;
  luckySignWhen: string;
  luckySignGod: string;
  mojo: number;
  fame: number;
  wealth: number;
  packContents: string;
  portraitImagePath: string;
  portraitActorName: string;
  movieTitle: string;
};

export type BlankXccCharacter = BlankDccCoreCharacter & {
  firstName: string;
  lastName: string;
  professionPresentation: string;
  armorCheckPenalty: number | null;
  armorSpeedPenalty: number | null;
  armorFumbleDie: string;
  luckySignWhen: string;
  luckySignGod: string;
  mojo: number;
  fame: number;
  wealth: number;
  packContents: string;
  portraitImagePath: string;
  portraitActorName: string;
  movieTitle: string;
};

const BLANK_XCC_CHARACTER: BlankXccCharacter = {
  firstName: '',
  lastName: '',
  professionPresentation: '',
  ...buildBlankDccCoreCharacter(),
  armorCheckPenalty: null,
  armorSpeedPenalty: null,
  armorFumbleDie: '',
  luckySignWhen: '',
  luckySignGod: '',
  mojo: DEFAULT_MOJO,
  fame: DEFAULT_FAME,
  wealth: DEFAULT_WEALTH,
  packContents: '',
  portraitImagePath: '',
  portraitActorName: '',
  movieTitle: '',
};

export function buildBlankXccCharacter(): BlankXccCharacter {
  return { ...BLANK_XCC_CHARACTER };
}

export function default_build(seed: string): ExportFormat<XccCharacter> {
  const rng = seedrandom(seed);
  return autoflatten('XCC Characters', seed, [buildXccCharacter(rng)]);
}

export function buildXccCharacter(rng: seedrandom.PRNG): XccCharacter {
  const gender = random_multi(rng, [...GENDERS]);
  const [firstName, lastName] = full_name(rng, gender, NAME_GROUP);
  const occupation = random_multi(rng, occupations);
  const race = requireMapping(raceNotes, occupation.Race, 'race notes');
  const pack =
    occupation.AdventurePack === ''
      ? undefined
      : requireMapping(packsByName, occupation.AdventurePack, 'adventurer pack');
  const armor = requireMapping(
    armorByName,
    occupation.ArmorEquipped === 'None' ? 'Unarmored' : occupation.ArmorEquipped,
    'armor',
  );
  const weapon = chooseWeapon(rng);
  const portrait = random_multi(
    rng,
    headshots.filter((candidate) => candidate.GENDER === gender),
  );
  const tradeGood = resolveTradeGood(rng, occupation);
  const packContents = pack?.otherEquipment.join(', ') ?? '';
  const armorName = occupation.ArmorEquipped;
  const armorAC = BASE_ARMOR_CLASS + armor.acBonus;
  const rolledLuckySign: { value?: XccLuckySign } = {};

  const core = buildDccCoreCharacter(rng, {
    professionTitle: occupation.ProfessionTitle,
    gender,
    race: occupation.Race,
    racialTraits: race.racialTraits,
    languages: race.racialLanguage,
    alignment: '',
    armorName,
    armorAC,
    equipment: occupation.AdventurePack,
    equipment2: '',
    equipment3: tradeGood,
    startingFunds: occupation.StartingFunds,
    weapon,
    rollLuckySign: (luckyRng) => {
      const sign = rollXccLuckySign(luckyRng);
      rolledLuckySign.value = sign;
      return sign;
    },
    baseSpeed: race.baseSpeed - armor.speedPenalty,
  });
  const luckySign = requireRolledLuckySign(rolledLuckySign.value);
  const movieTitle = random_multi(rng, movieNames).TITLE;

  return {
    firstName,
    lastName,
    professionPresentation: occupation.XCCPresentation,
    ...core,
    alignment: alignmentForXccGod(luckySign.god),
    languages: formatLanguages(race.racialLanguage, core.intelligenceMod),
    armorCheckPenalty: armor.checkPenalty,
    armorSpeedPenalty: armor.speedPenalty,
    armorFumbleDie: `d${armor.fumbleDie}`,
    luckySignWhen: luckySign.when,
    luckySignGod: luckySign.god,
    mojo: DEFAULT_MOJO,
    fame: DEFAULT_FAME,
    wealth: DEFAULT_WEALTH,
    packContents,
    portraitImagePath: xccPortraitImagePath(portrait),
    portraitActorName: portrait.NAME,
    movieTitle,
  };
}

export function alignmentForXccGod(god: string): 'Lawful' | 'Neutral' | 'Chaotic' {
  const alignment = XCC_GOD_ALIGNMENTS[god as keyof typeof XCC_GOD_ALIGNMENTS];

  if (!alignment) {
    throw new Error(`No XCC alignment is configured for boon god ${god}.`);
  }

  return alignment;
}

export function xccPortraitImagePath(portrait: XccCelebrityHeadshotsRow): string {
  return `${import.meta.env.BASE_URL}${XCC_HEADSHOT_DIRECTORY}${encodeURIComponent(xccPortraitFileName(portrait))}`;
}

export function xccPortraitFileName(portrait: XccCelebrityHeadshotsRow): string {
  const extension = new URL(portrait.HEADSHOT_URL).pathname.match(/\.[^./]+$/)?.[0]?.toLowerCase();

  if (!extension) {
    throw new Error(`Headshot URL has no file extension: ${portrait.HEADSHOT_URL}`);
  }

  // Keep this Windows-safe conversion aligned with download_xcc_headshots.ps1.
  let stem = portrait.NAME.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .trim()
    .replace(/[ .]+$/g, '');

  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem)) {
    stem = `_${stem}`;
  }

  if (!stem) {
    throw new Error(`Actor name has no usable filename characters: ${portrait.NAME}`);
  }

  return `${stem}${extension}`;
}

function chooseWeapon(rng: seedrandom.PRNG): DccCoreWeapon {
  const weapon = random_multi(
    rng,
    xccWeapons.filter((candidate) => candidate.RandomPool),
  );

  return {
    displayName: weapon.Weapon,
    underlyingName: weapon.WeaponUnderlying,
    damageBase: weapon.WeaponDamageBase,
    weaponType: weapon.WeaponType,
    range: weapon.Range,
    specialProperties: weapon.CommaSeparatedSpecialProperties,
  };
}

function rollXccLuckySign(rng: seedrandom.PRNG): XccLuckySign {
  const sign = random_multi(rng, xccLuckySigns);

  return {
    name: sign.XCCName,
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
    when: sign.XCCWhen,
    god: sign.XCCGod,
  };
}

function requireRolledLuckySign(sign: XccLuckySign | undefined): XccLuckySign {
  if (!sign) {
    throw new Error('XCC core generation did not roll a lucky sign.');
  }

  return sign;
}

function resolveTradeGood(rng: seedrandom.PRNG, occupation: Profession): string {
  if (occupation.TradeGood.toLowerCase() !== EXTRA_GEAR) {
    return occupation.TradeGood;
  }

  return random_multi(rng, xccItems).Item;
}

function formatLanguages(racialLanguage: string, intelligenceMod: number): string {
  const knownLanguages = racialLanguage === 'English' ? 'English' : `English, ${racialLanguage}`;

  if (intelligenceMod <= 0) {
    return knownLanguages;
  }

  const suffix = intelligenceMod === 1 ? 'language' : 'languages';
  return `${knownLanguages}, ${intelligenceMod} additional ${suffix}`;
}

function requireMapping<TValue>(
  mapping: Record<string, TValue>,
  key: string,
  label: string,
): TValue {
  const value = mapping[key];

  if (!value) {
    throw new Error(`Missing ${label} mapping for "${key}".`);
  }

  return value;
}
