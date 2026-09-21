import seedrandom from 'seedrandom';
import type { LuckyRow } from '../../table_data/Lucky';
import rawLucky from '../../table_data/Lucky.json';
import type { NamesRow } from '../../table_data/names';
import rawNames from '../../table_data/names.json';
import type { ProfessionsRow } from '../../table_data/Professions';
import rawProfessions from '../../table_data/Professions.json';
import type { WeaponsRow } from '../../table_data/Weapons';
import rawWeapons from '../../table_data/Weapons.json';
import { buildXccCharacter, type XccCharacter } from './xcc_impl';

const SYNTHETIC_LONGEST_SEED = 'xcc-synthetic-longest';

export function buildSyntheticLongestXccCharacter(): XccCharacter {
  const names = rawNames as NamesRow[];
  const professions = (rawProfessions as ProfessionsRow[]).filter(
    (profession) => profession.Source === 'XCC',
  );
  const luckySigns = (rawLucky as LuckyRow[]).filter((sign) => sign.inXCC === 'true');
  const weapons = (rawWeapons as WeaponsRow[]).filter(
    (weapon) => weapon.Source === 'XCC' && weapon.RandomPool.toLowerCase() === 'true',
  );
  const rangedWeapons = weapons.filter((weapon) => weapon.Range.trim() !== '0');
  const baseline = buildXccCharacter(seedrandom(SYNTHETIC_LONGEST_SEED));

  return {
    ...baseline,
    firstName: longestString(
      names
        .filter((name) => name.Group === 'US' && (name.Type === 'Male' || name.Type === 'Female'))
        .map((name) => name.Name),
    ),
    lastName: longestString(
      names
        .filter((name) => name.Group === 'US' && name.Type === 'Surname')
        .map((name) => name.Name),
    ),
    professionPresentation: longestString(
      professions.map((profession) => profession.XCCPresentation),
    ),
    luckySignName: longestString(luckySigns.map((sign) => sign.XCCName)),
    race: 'Half-Orc',
    alignment: 'Chaotic',

    strengthScore: 18,
    strengthMod: 3,
    agilityScore: 18,
    agilityMod: 3,
    staminaScore: 18,
    staminaMod: 3,
    personalityScore: 18,
    personalityMod: 3,
    intelligenceScore: 18,
    intelligenceMod: 3,
    luckScore: 18,
    luckMod: 3,

    saveFort: 6,
    saveReflex: 6,
    saveWill: 6,
    hitPoints: 10,
    AC: 21,
    initiative: 6,
    speed: 45,

    weaponDisplay: longestString(weapons.map((weapon) => weapon.Weapon)),
    weaponDamageBase: longestString(weapons.map((weapon) => weapon.WeaponDamageBase)),
    weaponRange: longestString(rangedWeapons.map((weapon) => weapon.Range)),
    attackMod: 6,
    attackDamageMod: 3,
    equipment: longestString(professions.map((profession) => profession.AdventurePack)),
    armorName: longestString(professions.map((profession) => profession.ArmorEquipped)),
  };
}

function longestString(values: string[]): string {
  const candidates = values.filter((value) => value.length > 0);

  if (candidates.length === 0) {
    throw new Error('Synthetic-longest XCC fixture has no candidate values.');
  }

  return candidates.reduce((longest, candidate) =>
    candidate.length > longest.length ? candidate : longest,
  );
}
