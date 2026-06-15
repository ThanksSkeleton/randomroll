import { BuildExportFormat, random_multi, random_single, type ExportFormat, type MultiColumnTable } from "../../framework";
import firstNames from "../../table_data/jp_male.json";
import planets from "../../table_data/planets.json"
import seedrandom from "seedrandom";

let t1 : MultiColumnTable = firstNames;
let t2 : MultiColumnTable = planets;

let OUTPUT_NAME = "SOL_PEOPLE";
let NAME = "Name";
let PLANET = "Planet";
let GROUNDED = "Grounded"
let colummn_names = [NAME, PLANET, GROUNDED];

// reroll vector: [row, col]

let NAME_INDEX = 0;

let Terrestrial_INDEX =3; 

export function default_build(seed: string) : ExportFormat<string[]> 
{
    return build_sol_export(seed, 10, [], false);
}

export function build_sol_export(seed: string, num_rows: number, reroll: [number, number][], terrestrial: boolean) : ExportFormat<string[]> 
{
    let rolled_data = []
    if (terrestrial) {
        rolled_data = build_terrestrial(seed, num_rows, reroll);
    } else {
        rolled_data = build_sol_people(seed, num_rows, reroll);
    }

    return BuildExportFormat(OUTPUT_NAME, seed, colummn_names, rolled_data, rolled_data);
}

function build_sol_people(seed: string, num_rows: number, reroll: [number, number][]): string[][] 
{
    return build_inner(seed, num_rows, reroll, t2.table.rows);
}

function build_terrestrial(seed: string, num_rows: number, reroll: [number, number][])
{
    let filtered = t2.table.rows.filter(x => x[Terrestrial_INDEX] == "true"); 
    return build_inner(seed, num_rows, reroll, filtered);
}

function build_inner(seed: string, num_rows: number, reroll: [number, number][], data: string[][]): string[][] 
{
    let output: string[][] = [];

    let rng : seedrandom.PRNG = seedrandom(seed);
    for (let i = 0; i < num_rows; i++) {
        let planet = planet_part(rng, data);
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
            let new_planet = planet_part(rng, data);
            output[row][1] = new_planet[0];
            output[row][2] = new_planet[1];
        }
    }

    return output;
}

function name_part(rng : seedrandom.PRNG): string 
{
    return random_single(rng, t1.table.rows.map(r => r[0]));
}

function planet_part(rng: seedrandom.PRNG, planet_data: string[][]) : [string, string] 
{
    let planet = random_multi(rng, planet_data);
    let grounded = (planet[3] === "true") ? "grounded" : "floating";
    return [planet[0], grounded];
}