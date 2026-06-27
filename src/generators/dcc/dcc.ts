import seedrandom from "seedrandom";
import { type ExportFormat } from "../../framework";
import { full_name } from "../../names_framework";

import type { LuckyRow } from "../../table_data/Lucky";
import rawLucky from "../../table_data/Lucky.json";

const lucky : LuckyRow[] = rawLucky;

export type StudentCharacter = {
  // Student Stuff
  studentStyle: string;
  school: string;
  gender: string;
  gpa: string;
  portrait: string;
  age: number;
  firstName: string;
  lastName: string;

  // Profession
  professionTitle: string;

  // Core Stats + Mods
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

  // Attacks and Defenses
  armorClass: number;  
  hitPoints: number;
  speed: number;
  initiative: number;
  saveReflex: number;
  saveFort: number;
  saveWill: number;

  // Weapon
  weaponDisplay: string;
  weaponUnderlying: string;
  weaponDamageBase: string;
  weaponType: string;

  attackMod: number;
  attackDamageMod: number;

  // Other Equipment
  equipment: string;
  equipment2: string;
  equipment3: string;
  startingFunds: number;

  // Lucky Sign
  luckySignName: string;
  luckySignDescription: string;

  // Other Stuff
  languages: string[];
  fantasyTraits: string;
  fantasyRace: string;
};  

const MALE_FEMALE = ["MALE", "FEMALE"];

const US_STYLE = "US";

const DEFAULT_SCHOOL = "St. Cuthbert's Prepatory Academy";

const DEFAULT_PORTRAIT = "Default Portrait";

const DEFAULT_AGE = 18;



export function default_build(seed: string): ExportFormat<StudentCharacter> 
{
    let rng : seedrandom.PRNG = seedrandom(seed);
    let to_return = [];
    for (let i = 0; i < 4; i++) 
    {
        to_return.push(build_dcc_student(rng, US_STYLE, DEFAULT_SCHOOL, DEFAULT_AGE));
    }
    return to_return;
}




function build_dcc_student(rng: seedrandom.PRNG, nationality: string, school: string, age: number): StudentCharacter 
{
    // randomly rolled and mods

    let gender = male_female(rng);
    let name = full_name(rng, gender, nationality);
    let profession = profession_info(rng, gender);

    let str = roll_3_d_6(rng);
    let str_mod = ability_mod(str);
    let agi = roll_3_d_6(rng);
    let agi_mod = ability_mod(agi);
    let con = roll_3_d_6(rng);
    let con_mod = ability_mod(con);
    let per = roll_3_d_6(rng);
    let per_mod = ability_mod(per);
    let int = roll_3_d_6(rng);
    let int_mod = ability_mod(int);
    let luck = roll_3_d_6(rng);
    let luck_mod = ability_mod(luck);

    let luckySign = lucky_sign(rng);

    let hit_points_base = roll_1_d_4(rng);

    let equipment1 = additional_equipment(rng);

    // dependents

    let ac = 10 + agi_mod + luckySign.AC * luck_mod
    let hitPoints = hit_points_base + con_mod + luckySign.HP * luck_mod;
    let speed = 30 + luckySign.Speed * luck_mod;
    let initiative = agi_mod + luckySign.Init * luck_mod;
    let saveReflex = agi_mod + luckySign.ReflexSave * luck_mod;
    let saveFort = con_mod + luckySign.FortitudeSave * luck_mod;
    let saveWill = per_mod + luckySign.WillSave * luck_mod;
    
    let weaponDisplay = profession.weaponDisplay;
    let weaponUnderlying = profession.weaponUnderlying;
    let attackDamageBase = profession.weaponDamageBase;
    let weaponType = profession.weaponType;
    let attackMod = weaponType == MELEE ? str_mod + luckySign.Melee_Attack * luck_mod : agi_mod + luckySign.Ranged_Attack * luck_mod;
    let attackDamageMod = weaponType == MELEE ? str_mod + luckySign.Melee_Damage * luck : agi_mod + luckySign.Ranged_Damage * luck_mod;

    let luckySignName = luckySign.Tarot;
    let luckySignDescription = luckySign.Description;

    let equipment2 = "";
    let equipment3 = profession.tradeGood;

    let languages = ["English"];
    let fantasyRace = "Human";
    let fantasyTraits = "";
    let startingFunds = 0;

}

function male_female(rng: seedrandom.PRNG): string 
{
    let index = Math.floor(rng()* MALE_FEMALE.length);
    return MALE_FEMALE[index];
}

function roll_3_d_6(rng: seedrandom.PRNG) : number 
{
    let a = Math.floor(rng()* 6) + 1;
    let b = Math.floor(rng()* 6) + 1;
    let c = Math.floor(rng()* 6) + 1;
    return a+b+c;
}

function ability_mod(score : number): number
{
  if (score === 3) return -3;
  if (score <= 5) return -2;
  if (score <= 7) return -1;
  if (score <= 12) return 0;
  if (score <= 15) return 1;
  if (score <= 17) return 2;
  return 3;
}

function roll_1_d_4(rng: seedrandom.PRNG) : number 
{
    return Math.floor(rng()* 4) + 1;
}

const MELEE = "Melee";
const RANGED = "Ranged";

type ProfessionInfo = {
  professionTitle: string;
  weaponDisplay: string;
  weaponUnderlying: string;
  weaponDamageBase: string;
  weaponType: string;
  tradeGood: string;
  genderLock: string;
}

// FROM TABLE
function profession_info(rng:seedrandom.PRNG, gender: string): ProfessionInfo 
{

}


// FROM TABLE
function additional_equipment(rng:seedrandom.PRNG) : string {

}

// FROM TABLE
function lucky_sign(rng:seedrandom.PRNG) : LuckyRow 
{

}