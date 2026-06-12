import seedrandom from "seedrandom";
import { BuildExportFormat, random_multi, type ExportFormat, type MultiColumnTable } from "../../framework";
import powers from "../../table_data/IATW_Powers.json";

let powers_table : MultiColumnTable = powers;

type Power = {
    Kind: string
    Name: string
    Tag: string
}

function array_to_power(a: string[]) : Power 
{
    return {
        Kind: a[KIND],
        Name: a[NAME],
        Tag: a[TAG]
    }
}

const fields: (keyof Power)[] = ["Kind", "Name", "Tag"];

const columnNames: string[] = [
    ...fields.map(field => `Primary Power 1 ${field}`),
    ...fields.map(field => `Primary Power 2 ${field}`),
    ...fields.map(field => `Secondary Power 1 ${field}`),
    ...fields.map(field => `Secondary Power 2 ${field}`),
    ...fields.map(field => `Secondary Power 3 ${field}`),
];

function flattenPowers(powers: [Power, Power, Power, Power, Power]): string[] {
    if (powers.length !== 5) {
        throw new Error(`Expected exactly 5 powers, got ${powers.length}`);
    }

    return powers.flatMap(power =>
        fields.map(field => power[field])
    );
}

const NAME = 0;
const KIND = 1;
const TAG = 2;

const PRIMARY = "Primary";
const SECONDARY = "Secondary";

const Excluded_Powers = ["Elemental"];
const Colorless = ["Gimmick", "Mutated", "Hypersensory"];
const Color = ["Physics","Air","Alien","Chemistry","Animal","Water","Time","Darkness","Light","Earth","Sonic","Electrical","Energy","Ice","Fire","Radiation", "Tech", "Shapeshift" ];
const Strong_Color = ["Psionic", "Occult"];

const OutputName = "GRUNGE SUPERPOWERS";

export function build_super_export(seed: string, num_characters: number) : ExportFormat<[Power, Power, Power, Power, Power]> 
{
    let output_data = build_super(seed, num_characters);
    let flatted_powers = output_data.map(p => flattenPowers(p));
    return BuildExportFormat(OutputName, seed, columnNames, flatted_powers, output_data);
}

export function build_super(seed: string, num_characters: number): [Power, Power, Power, Power, Power][] 
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

function first(rng: seedrandom.PRNG): Power
{
    // Any primary power except Excluded Power Tags
    return array_to_power(random_multi(rng, powers_table.table.rows.filter(r => r[KIND] == "Primary").filter(r => !Excluded_Powers.includes(r[TAG]))));
}

function second(rng: seedrandom.PRNG, first_power: Power): Power
{
    let color_restricted = []
    if (Colorless.includes(first_power.Tag))
    {
        // Colorless or new Color but not Strong Color
        color_restricted = powers_table.table.rows.filter(r => Color.includes(r[TAG]) || Colorless.includes(first_power.Tag));
    } 
    else if (Color.includes(first_power.Tag)) 
    {
        // Colorless or Same Color
        color_restricted = powers_table.table.rows.filter(r => Colorless.includes(r[TAG]) || r[TAG] == first_power.Tag)
    } 
    else if (Strong_Color.includes(first_power.Tag)) 
    {
        // only matching
        color_restricted = powers_table.table.rows.filter(r => r[TAG] == first_power.Tag);
    } else {
        throw Error("Impossible_Category" + first_power.Tag)
    }

    // Second primary
    // Excludes Excluded Powers
    // Not the exact same power
    return array_to_power(random_multi(rng, color_restricted
        .filter(r => r[KIND] == "Primary")
        .filter(r => !Excluded_Powers.includes(r[TAG]))
        .filter(r => !(r[TAG] == first_power.Tag && r[NAME] == first_power.Name))));
}

function three_secondary(rng: seedrandom.PRNG, first_power: Power, second_power: Power): [Power, Power, Power] 
{
    let secondary_1_table = powers_table.table.rows.filter(r => r[KIND] == "Secondary" && (r[TAG] == first_power.Tag || r[TAG] == second_power.Tag))
    let secondary_1 = array_to_power(random_multi(rng, secondary_1_table));
    let secondary_2_table = secondary_1_table.filter(r => r[NAME] != secondary_1[NAME]);
    let secondary_2 = array_to_power(random_multi(rng, secondary_2_table))
    let secondary_3_table = secondary_2_table.filter(r=> r[NAME] != secondary_2[NAME]);
    let secondary_3 = array_to_power(random_multi(rng, secondary_3_table));
    return [secondary_1, secondary_2, secondary_3]
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