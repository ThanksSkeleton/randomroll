import type seedrandom from 'seedrandom';

export type DccCoreWeapon = {
  displayName: string;
  underlyingName: string;
  damageBase: string;
  weaponType: string;
  range: string;
  specialProperties: string;
};

export type DccCoreLuckySign = {
  name: string;
  description: string;
  meleeAttack: number;
  rangedAttack: number;
  meleeDamage: number;
  rangedDamage: number;
  fortitudeSave: number;
  reflexSave: number;
  willSave: number;
  armorClass: number;
  initiative: number;
  hitPoints: number;
  speed: number;
};

export type DccCoreCharacter = {
  professionTitle: string;
  gender: string;

  race: string;
  racialTraits: string;
  languages: string;
  alignment: string;

  strengthScore: number;
  strengthMod: number;
  agilityScore: number;
  agilityMod: number;
  staminaScore: number;
  staminaMod: number;
  personalityScore: number;
  personalityMod: number;
  intelligenceScore: number;
  intelligenceMod: number;
  luckScore: number;
  luckMod: number;

  armorName: string;
  armorAC: number;
  AC: number;
  hitPoints: number;
  speed: number;
  initiative: number;
  saveReflex: number;
  saveFort: number;
  saveWill: number;

  weaponDisplay: string;
  weaponUnderlying: string;
  weaponDamageBase: string;
  weaponType: string;
  weaponRange: string;
  weaponSpecialProperties: string;
  attackMod: number;
  attackDamageMod: number;

  luckySignName: string;
  luckySignDescription: string;

  // Compatibility inventory slots. Their meanings vary by consumer:
  // XCC: adventurer pack. DCC Students: tool.
  equipment: string;
  // XCC: intentionally blank. DCC Students: cultural item.
  equipment2: string;
  // XCC and DCC Students: occupation trade good.
  equipment3: string;
  startingFunds: number;
};

export type BlankDccCoreCharacter = {
  [K in keyof DccCoreCharacter]: DccCoreCharacter[K] extends number
    ? number | null
    : DccCoreCharacter[K];
};

export type BuildDccCoreCharacterOptions = {
  professionTitle: string;
  gender: string;
  race: string;
  racialTraits: string;
  languages: string;
  alignment: string;
  armorName: string;
  armorAC: number;
  equipment: string;
  equipment2: string;
  equipment3: string;
  startingFunds: number;
  weapon: DccCoreWeapon;
  rollLuckySign: (rng: seedrandom.PRNG) => DccCoreLuckySign;
  baseSpeed?: number;
};

const MELEE = 'Melee';

export function buildDccCoreCharacter(
  rng: seedrandom.PRNG,
  options: BuildDccCoreCharacterOptions,
): DccCoreCharacter {
  const strengthScore = roll3d6(rng);
  const strengthMod = abilityModifier(strengthScore);
  const agilityScore = roll3d6(rng);
  const agilityMod = abilityModifier(agilityScore);
  const staminaScore = roll3d6(rng);
  const staminaMod = abilityModifier(staminaScore);
  const personalityScore = roll3d6(rng);
  const personalityMod = abilityModifier(personalityScore);
  const intelligenceScore = roll3d6(rng);
  const intelligenceMod = abilityModifier(intelligenceScore);
  const luckScore = roll3d6(rng);
  const luckMod = abilityModifier(luckScore);

  // Consumers choose the compatible lucky-sign table. Keeping this roll after
  // the abilities preserves the established DCC student seed sequence.
  const luckySign = options.rollLuckySign(rng);
  const baseHitPoints = rollDie(rng, 4);
  const baseSpeed = options.baseSpeed ?? 30;
  const isMelee = options.weapon.weaponType === MELEE;
  const usesAgility = !isMelee || options.weapon.specialProperties.split(',').includes('Agility');

  return {
    professionTitle: options.professionTitle,
    gender: options.gender,

    race: options.race,
    racialTraits: options.racialTraits,
    languages: options.languages,
    alignment: options.alignment,

    strengthScore,
    strengthMod,
    agilityScore,
    agilityMod,
    staminaScore,
    staminaMod,
    personalityScore,
    personalityMod,
    intelligenceScore,
    intelligenceMod,
    luckScore,
    luckMod,

    armorName: options.armorName,
    armorAC: options.armorAC,
    AC: options.armorAC + agilityMod + luckySign.armorClass * luckMod,
    hitPoints: Math.max(baseHitPoints + staminaMod + luckySign.hitPoints * luckMod, 1),
    speed: baseSpeed + luckySign.speed * luckMod,
    initiative: agilityMod + luckySign.initiative * luckMod,
    saveReflex: agilityMod + luckySign.reflexSave * luckMod,
    saveFort: staminaMod + luckySign.fortitudeSave * luckMod,
    saveWill: personalityMod + luckySign.willSave * luckMod,

    weaponDisplay: options.weapon.displayName,
    weaponUnderlying: options.weapon.underlyingName,
    weaponDamageBase: options.weapon.damageBase,
    weaponType: options.weapon.weaponType,
    weaponRange: options.weapon.range,
    weaponSpecialProperties: options.weapon.specialProperties,
    attackMod:
      (usesAgility ? agilityMod : strengthMod) +
      (isMelee ? luckySign.meleeAttack : luckySign.rangedAttack) * luckMod,
    attackDamageMod:
      (usesAgility ? agilityMod : strengthMod) +
      (isMelee ? luckySign.meleeDamage : luckySign.rangedDamage) * luckMod,

    luckySignName: luckySign.name,
    luckySignDescription: luckySign.description,

    equipment: options.equipment,
    equipment2: options.equipment2,
    equipment3: options.equipment3,
    startingFunds: options.startingFunds,
  };
}

export function buildBlankDccCoreCharacter(): BlankDccCoreCharacter {
  return {
    professionTitle: '',
    gender: '',

    race: '',
    racialTraits: '',
    languages: '',
    alignment: '',

    strengthScore: null,
    strengthMod: null,
    agilityScore: null,
    agilityMod: null,
    staminaScore: null,
    staminaMod: null,
    personalityScore: null,
    personalityMod: null,
    intelligenceScore: null,
    intelligenceMod: null,
    luckScore: null,
    luckMod: null,

    armorName: '',
    armorAC: null,
    AC: null,
    hitPoints: null,
    speed: null,
    initiative: null,
    saveReflex: null,
    saveFort: null,
    saveWill: null,

    weaponDisplay: '',
    weaponUnderlying: '',
    weaponDamageBase: '',
    weaponType: '',
    weaponRange: '',
    weaponSpecialProperties: '',
    attackMod: null,
    attackDamageMod: null,

    luckySignName: '',
    luckySignDescription: '',

    equipment: '',
    equipment2: '',
    equipment3: '',
    startingFunds: null,
  };
}

export function roll3d6(rng: seedrandom.PRNG): number {
  return rollDie(rng, 6) + rollDie(rng, 6) + rollDie(rng, 6);
}

export function rollDie(rng: seedrandom.PRNG, sides: number): number {
  if (!Number.isInteger(sides) || sides < 1) {
    throw new Error(`Die sides must be a positive integer; received ${sides}.`);
  }

  return Math.floor(rng() * sides) + 1;
}

export function abilityModifier(score: number): number {
  if (score === 3) return -3;
  if (score <= 5) return -2;
  if (score <= 7) return -1;
  if (score <= 12) return 0;
  if (score <= 15) return 1;
  if (score <= 17) return 2;
  return 3;
}
