// import seedrandom from "seedrandom";
// import { random_multi, type ExportFormat } from "../../framework";

// export type StudentCharacter = {
//   // Student Stuff
//   studentStyle: string;
//   school: string;
//   gender: "Male" | "Female" | string;
//   gpa: string;
//   portrait: string;
//   age: number;
//   firstName: string;
//   lastName: string;

//   // Profession
//   professionTitle: string;

//   // Core Stats + Mods
//   strengthScore: number;
//   strengthMod: number;
//   agilityScore: number;
//   agilityMod: number;
//   staminaScore: number;
//   staminaMod: number;
//   personalityScore: number;
//   personalityMod: number;
//   intelligenceScore: number;
//   intelligenceMod: number;
//   luckScore: number;
//   luckMod: number;

//   // Attacks and Defenses
//   armorClass: number;
//   hitPoints: number;
//   weaponDisplay: string;
//   weaponUnderlying: string;
//   attackDamageBase: string;
//   weaponUnderlyingType: "Melee" | "Missile";
//   attackMod: number;
//   attackDamageMod: number;
//   speed: number;
//   initiative: number;
//   saveReflex: number;
//   saveFort: number;
//   saveWill: number;

//   // Other Equipment
//   equipment: string;
//   equipment2: string;
//   equipment3: string;
//   tradeGood: string;
//   startingFunds: number;

//   // Lucky Sign
//   luckySignName: string;
//   luckySignDescription: string;

//   // Other Stuff
//   fantasylanguages: string;
//   fantasyTraits: string;
//   fantasyRace: string;
// };  

// const MALE_FEMALE = ["MALE", "FEMALE"];

// const US_STYLE = "US";

// const DEFAULT_SCHOOL = "St. Cuthbert's Prepatory Academy";

// const DEFAULT_PORTRAIT = "Default Portrait";

// const DEFAULT_AGE = 18;



// export function default_build(seed: string): ExportFormat<StudentCharacter> 
// {
//     let rng : seedrandom.PRNG = seedrandom(seed);
//     let to_return = [];
//     for (let i = 0; i < 4; i++) 
//     {
//         to_return.push(build_dcc_student(rng, US_STYLE, DEFAULT_SCHOOL, DEFAULT_AGE));
//     }
//     return to_return;
// }




// function build_dcc_student(rng: seedrandom.PRNG, nationality: NationalityKey, school: string, age: number): StudentCharacter 
// {
//     let gender = male_female(rng);
//     let first_name = random_multi(rng, NAME_FILES()




// }


// export type NationalityKey = "US" | "JP";
// export type GenderKey = "Male" | "Female";

// export type NameFileSet = {
//   firstNames: string;
//   lastNames: string;
// };

// export const NAME_FILES: Record<NationalityKey, Record<GenderKey, NameFileSet>> = {
//   US: {
//     Male: {
//       firstNames: "US_male_first_names.json",
//       lastNames: "US_last_names.json",
//     },
//     Female: {
//       firstNames: "US_female_first_names.json",
//       lastNames: "US_last_names.json",
//     },
//   },

//   JP: {
//     Male: {
//       firstNames: "JP_male_first_names.json",
//       lastNames: "JP_last_names.json",
//     },
//     Female: {
//       firstNames: "JP_female_first_names.json",
//       lastNames: "JP_last_names.json",
//     },
//   },
// } as const;

// function male_female(rng: seedrandom.PRNG): string 
// {
//     let index = Math.floor(rng()* MALE_FEMALE.length);
//     return MALE_FEMALE[index];
// }

// function roll_3_d_6(rng: seedrandom.PRNG) : number 
// {
//     let a = Math.floor(rng()* 6) + 1;
//     let b = Math.floor(rng()* 6) + 1;
//     let c = Math.floor(rng()* 6) + 1;
//     return a+b+c;
// }

// function ability_mod(score : number): number
// {
//   if (score === 3) return -3;
//   if (score <= 5) return -2;
//   if (score <= 7) return -1;
//   if (score <= 12) return 0;
//   if (score <= 15) return 1;
//   if (score <= 17) return 2;
//   return 3;
// }

// function roll_1_d_4(rng: seedrandom.PRNG) : number 
// {
//     return Math.floor(rng()* 4) + 1;
// }

// type ProfessionInfo = {
//   professionTitle: string;
//   weaponDisplay: string;
//   weaponUnderlying: string;
//   attackDamageBase: string;
//   weaponUnderlyingType: "Melee" | "Missile";
//   tradeGood: string;
// }

// // FROM TABLE
// function profession_info(rng:seedrandom.PRNG): ProfessionInfo {

// }


// // FROM TABLE
// function additional_equipment(rng:seedrandom.PRNG) : string {
    
// }

// type LuckySignInfo = {
//   originalName: string;
//   effectDescription: string;
//   tarot: string;

//   meleeAttack: number;
//   rangedAttack: number;
//   meleeDamage: number;
//   rangedDamage: number;

//   fortitudeSave: number;
//   reflexSave: number;
//   willSave: number;

//   ac: number;
//   init: number;
//   hp: number;
//   speed: number;
// };

// // FROM TABLE
// function LuckySignInfo(rng:seedrandom.PRNG) : LuckySignInfo {

// }

// // // Student STuff
// //   "studentStyle" : "US", 
// //   "school": "St. Cutherbert's School For Gifted Children",
// //   "gender": "Male",
// //   "gpa" : "3.9",
// //   "portrait" : "8",
// //   "age" : "18",
// //   "firstName" : "Bob",
// //   "lastName" : "Johnson" 
// // // Profession
// //   "occTitle": "Cheesemaker",
// // // Core Stats + Mods
// //   "strengthScore": "13",
// //   "strengthMod": "1",
// //   "agilityScore": "11",
// //   "agilityMod": "0",
// //   "staminaScore": "16",
// //   "staminaMod": "2",
// //   "personalityScore": "15",
// //   "personalityMod": "1",
// //   "intelligenceScore": "15",
// //   "intelligenceMod": "1",
// //   "luckScore": "9",
// //   "luckMod": "0",
// // // Attacks and Defenses
// //   "armorClass": "10",
// //   "hitPoints": "3",
// //   "weaponDisplay": "Cudgel",
// //   "weaponUnderlying": "Staff",
// //   "attackDamageBase": "1d4",
// //   "weaponUnderlyingType" : "Melee", #or Missile
// //   "attackMod": "1",
// //   "attackDamageMod": "1",
// //   "speed": "30",
// //   "initiative": "0",
// //   "saveReflex": "0",
// //   "saveFort": "2",
// //   "saveWill": "1",
// // // Other Equipment
// //   "equipment": "Sack (small) (8 cp)",
// //   "equipment2": "",
// //   "equipment3": "Water skin",
// //   "tradeGood": "Stinky cheese",
// //   "startingFunds": "29 cp",
// // // Lucky Sign
// //   "luckySign": "Born on the battlefield (Damage rolls) (+0)",
// // // Other Stuff
// //   "fantasylanguages": "Common/Dwarf",
// //   "fantasyTraits": "", 
// //   "fantasyRace": ""
// // }