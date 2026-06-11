import type seedrandom from "seedrandom";
import { IncludeExclude, random_multi_filter, random_single, type EntryFilter, type MultiColumnTable, type SingletonTable } from "./table";
import powers from "./table_data/IATW_Powers.json";

let powers_table : MultiColumnTable = powers;


const NAME = 0;
const KIND = 1;
const TAG = 2;

const Excluded_Powers = ["Elemental"];
const Colorless = ["Gimmick", "Mutated", "Hypersensory"];
const Soft_Color = ["Tech, Shapeshift"];
const Color = ["Physics","Air","Alien","Chemistry","Animal","Water","Time","Darkness","Light","Earth","Sonic","Electrical","Energy","Ice","Fire","Radiation"];
const Strong_Color = ["Psionic", "Occult"];

const no_elemental_filter: EntryFilter = {
        include_exclude: IncludeExclude.Exclude,
        column_index: TAG,
        filter: Excluded_Powers
    };

function SameName(name: string): EntryFilter
 {
    return {
        include_exclude: IncludeExclude.Exclude,
        column_index: NAME,
        filter: [name]
    }
};

const primary: EntryFilter = {
        include_exclude: IncludeExclude.Include,
        column_index: KIND,
        filter: ["Primary"]
    };

const secondary: EntryFilter = {
    include_exclude: IncludeExclude.Include,
    column_index: KIND,
    filter: ["Secondary"]
};

function first(rng: seedrandom.PRNG): string[] 
{
    return random_multi_filter(rng, powers_table, [no_elemental_filter, primary])
}

function second(rng: seedrandom.PRNG, first_tag:string) : string[]
{
    let filters = [];
    if (first_tag in Colorless) {

    } else if (first_tag in Color || first_tag in Soft_Color) {

    } else if (first_tag in Strong_Color) {
        let only_strong: EntryFilter = {
            include_exclude: IncludeExclude.Include,
            column_index: 2,
            filter: [first_tag]
        };
    }
}


// export function build(seed: string, num_rows: number, reroll: [number, number][]): string[][] 
// {
//     return build_inner(seed, num_rows, reroll, []);
// }

// export function build_terrestrial(seed: string, num_rows: number, reroll: [number, number][])
// {
//     let terrestrial_filter : EntryFilter = {
//         include_exclude: IncludeExclude.Include,
//         column_index: 3,
//         filter: 'true'
//     };
//     return build_inner(seed, num_rows, reroll, [terrestrial_filter]);
// }

// function build_inner(seed: string, num_rows: number, reroll: [number, number][], filters: EntryFilter[] ): string[][] 
// {
//     let output: string[][] = [];

//     let rng : seedrandom.PRNG = seedrandom(seed);
//     for (let i = 0; i < num_rows; i++) {
//         let planet = planet_part(rng, filters);
//         output[i] = [name_part(rng), planet[0], planet[1]]
//     }

//     for (let k = 0; k < reroll.length; k++) 
//     {
//         let row = reroll[k][0];
//         let col = reroll[k][1];
//         if (col == NAME_INDEX) 
//         {
//             output[row][0] = name_part(rng);
//         } else {
//             let new_planet = planet_part(rng, filters);
//             output[row][1] = new_planet[0];
//             output[row][2] = new_planet[1];
//         }
//     }

//     return output;
// }

// function name_part(rng : seedrandom.PRNG): string 
// {
//     return random_single(rng, t1);
// }

// function planet_part(rng: seedrandom.PRNG, filters: EntryFilter[]) : [string, string] 
// {
//     let planet = random_multi_filter(rng, t2, filters);
//     let grounded = (planet[3] === "true") ? "grounded" : "floating";
//     return [planet[0], grounded];
// }