import seedrandom from "seedrandom";
import { random_multi, type MultiColumnTable } from "./table";
import powers from "./table_data/IATW_Powers.json";

let powers_table : MultiColumnTable = powers;


const NAME = 0;
const KIND = 1;
const TAG = 2;

const Excluded_Powers = ["Elemental"];
const Colorless = ["Gimmick", "Mutated", "Hypersensory"];
const Color = ["Physics","Air","Alien","Chemistry","Animal","Water","Time","Darkness","Light","Earth","Sonic","Electrical","Energy","Ice","Fire","Radiation", "Tech, Shapeshift" ];
const Strong_Color = ["Psionic", "Occult"];

function first(rng: seedrandom.PRNG): string[] 
{
    // Any primary power except Excluded Power Tags
    return random_multi(rng, powers_table.table.rows.filter(r => r[KIND] == "Primary").filter(r => !Excluded_Powers.includes(r[TAG])));
}

function second(rng: seedrandom.PRNG, first_power: string[]): string[] 
{
    let color_restricted = []
    if (Colorless.includes(first_power[TAG]))
    {
        // Colorless or new Color but not Strong Color
        color_restricted = powers_table.table.rows.filter(r => Color.includes(r[TAG]) || Colorless.includes(r[TAG]));
    } 
    else if (Color.includes(first_power[TAG])) 
    {
        // Colorless or Same Color
        color_restricted = powers_table.table.rows.filter(r => Colorless.includes(r[TAG]) || r[TAG] == first_power[TAG])
    } 
    else if (Strong_Color.includes(first_power[TAG])) 
    {
        // only matching
        color_restricted = powers_table.table.rows.filter(r => r[TAG] == first_power[TAG]);
    } else {
        throw Error("Impossible_Category" + first_power[TAG])
    }

    // Second primary
    // Excludes Excluded Powers
    // Not the exact same power
    return random_multi(rng, color_restricted
        .filter(r => r[KIND] == "Primary")
        .filter(r => !Excluded_Powers.includes(r[TAG]))
        .filter(r => !(r[TAG] == first_power[TAG] && r[NAME] == first_power[NAME])));
}

function three_secondary(rng: seedrandom.PRNG, first_power: string[], second_power: string[]): [string[], string[], string[]] 
{
    let secondary_1_table = powers_table.table.rows.filter(r => r[KIND] == "Secondary" && (r[TAG] == first_power[TAG] || r[TAG] == second_power[TAG]))
    let secondary_1 = random_multi(rng, secondary_1_table);
    let secondary_2_table = secondary_1_table.filter(r => r[NAME] != secondary_1[NAME]);
    let secondary_2 = random_multi(rng, secondary_2_table);
    let secondary_3_table = secondary_2_table.filter(r=> r[NAME] != secondary_2[NAME]);
    let secondary_3 = random_multi(rng, secondary_3_table);
    return [secondary_1, secondary_2, secondary_3]
}

export function build_super(seed: string, num_characters: number): [string[], string[], string[], string[], string[]][] 
{
    let rng : seedrandom.PRNG = seedrandom(seed);
    let to_return = [];
    for (let i = 0; i < num_characters; i++) {
        let first_power = first(rng);
        let second_power = second(rng, first_power);
        let three_secondary_powers = three_secondary(rng, first_power, second_power);
        to_return.push([first_power, second_power, three_secondary_powers[0], three_secondary_powers[1], three_secondary_powers[2]]);
    }
    return to_return;
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