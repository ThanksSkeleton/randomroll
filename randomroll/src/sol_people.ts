import { IncludeExclude, random_multi_filter, random_single, type EntryFilter, type MultiColumnTable, type SingletonTable } from "./table";
import firstNames from "./table_data/JP_male_first_names.json";
import planets from "./table_data/Sol_Planets.json"
import seedrandom from "seedrandom";

let t1 : SingletonTable = firstNames;
let t2 : MultiColumnTable = planets;

// Output NAME, PLANET, GROUNDED/FLOATING
let NAME_INDEX = 0;
let PLANET_INDEX = 1;
let GROUNDED_INDEX = 2;
// reroll vector: [row, col]

export function build(seed: string, num_rows: number, reroll: [number, number][]): string[][] 
{
    return build_inner(seed, num_rows, reroll, []);
}

export function build_terrestrial(seed: string, num_rows: number, reroll: [number, number][])
{
    let terrestrial_filter : EntryFilter = {
        include_exclude: IncludeExclude.Include,
        column_index: 3,
        filter: 'true'
    };
    return build_inner(seed, num_rows, reroll, [terrestrial_filter]);
}


function build_inner(seed: string, num_rows: number, reroll: [number, number][], filters: EntryFilter[] ): string[][] 
{
    let output: string[][] = [];

    let rng : seedrandom.PRNG = seedrandom(seed);
    for (let i = 0; i < num_rows; i++) {
        let planet = planet_part(rng, filters);
        output[i] = [name_part(rng), planet[0], planet[1]]
    }

    for (let k = 0; k < reroll.length; k++) 
    {
        let row = reroll[k][0];
        let col = reroll[k][1];
        if (col == NAME_INDEX) 
        {
            output[row][0] = name_part(rng);
        } else {
            let new_planet = planet_part(rng, filters);
            output[row][1] = new_planet[0];
            output[row][2] = new_planet[1];
        }
    }

    return output;
}

function name_part(rng : seedrandom.PRNG): string 
{
    return random_single(rng, t1);
}

function planet_part(rng: seedrandom.PRNG, filters: EntryFilter[]) : [string, string] 
{
    let planet = random_multi_filter(rng, t2, filters);
    let grounded = (planet[3] === "true") ? "grounded" : "floating";
    return [planet[0], grounded];
}