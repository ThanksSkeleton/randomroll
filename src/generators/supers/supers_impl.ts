import seedrandom from "seedrandom";
import { BuildExportFormat, random_multi, type ExportFormat } from "../../framework";
import powers_raw from "../../table_data/powers.json";
import type { PowersRow } from "../../table_data/powers";

let PRIMARY = "Primary";
let SECONDARY = "Secondary";

let powers_table : PowersRow[] = powers_raw;

type FivePowers = [PowersRow, PowersRow, PowersRow, PowersRow, PowersRow];

const fields: (keyof PowersRow)[] = ["Kind", "Name", "Tag", "Source", "variantOf"];

const columnNames: string[] = [
    ...fields.map(field => `Primary Power 1 ${field}`),
    ...fields.map(field => `Primary Power 2 ${field}`),
    ...fields.map(field => `Secondary Power 1 ${field}`),
    ...fields.map(field => `Secondary Power 2 ${field}`),
    ...fields.map(field => `Secondary Power 3 ${field}`),
];

function flattenPowers(powers: FivePowers): string[] {
    if (powers.length !== 5) {
        throw new Error(`Expected exactly 5 powers, got ${powers.length}`);
    }

    return powers.flatMap(power =>
        fields.map(field => power[field])
    );
}

const Colorless = ["Gimmick", "Mutated", "Hypersensory"];
const Color = ["Physics","Air","Alien","Chemistry","Animal","Water","Time","Darkness","Light","Earth","Sonic","Electricity","Energy","Ice","Fire","Radiation", "Tech", "Shapeshift"];
const Strong_Color = ["Psionic", "Occult"];

const OutputName = "GRUNGE SUPERPOWERS";

export function default_build(seed: string): ExportFormat<FivePowers> 
{
    return build_super_export(seed, 1);
}

export function build_super_export(seed: string, num_characters: number) : ExportFormat<FivePowers> 
{
    let output_data = build_super(seed, num_characters);
    let flatted_powers = output_data.map(p => flattenPowers(p));
    return BuildExportFormat(OutputName, seed, columnNames, flatted_powers, output_data);
}

export function build_super(seed: string, num_characters: number): FivePowers[] 
{
    let rng : seedrandom.PRNG = seedrandom(seed);
    let to_return: FivePowers[] = [];
    for (let i = 0; i < num_characters; i++) {
        let first_power = first(rng);
        let second_power = second(rng, first_power);
        let three_secondary_powers = three_secondary(rng, first_power, second_power);
        to_return.push([first_power, second_power, three_secondary_powers[0], three_secondary_powers[1], three_secondary_powers[2]]);
    }
    return to_return;
}

function not_duplicate(p: PowersRow, other_powers: PowersRow[]): boolean 
{
    return other_powers.every(op => op.Name != p.Name && op.Name != p.variantOf && op.variantOf != p.Name && (op.variantOf != p.variantOf || p.variantOf == ""));
}

function first(rng: seedrandom.PRNG): PowersRow
{
    // Any primary power except Excluded Power Tags
    return random_multi(rng, powers_table.filter(r => r.Kind == PRIMARY));
}

function second(rng: seedrandom.PRNG, first_power: PowersRow): PowersRow
{
    let primaries = powers_table.filter(r => r.Kind == PRIMARY);
    let non_dupes = primaries.filter(a => not_duplicate(a, [first_power]));

    let color_restricted = []
    if (Colorless.includes(first_power.Tag))
    {
        // Colorless or new Color but not Strong Color
        color_restricted = non_dupes.filter(r => Colorless.includes(r.Tag) || Color.includes(r.Tag));
    } 
    else if (Color.includes(first_power.Tag)) 
    {
        // Colorless or Same Color
        color_restricted = non_dupes.filter(r => Colorless.includes(r.Tag) || r.Tag == first_power.Tag)
    } 
    else if (Strong_Color.includes(first_power.Tag)) 
    {
        // only matching
        color_restricted = non_dupes.filter(r => r.Tag == first_power.Tag);
    } else {
        throw Error("Impossible_Category" + first_power.Tag)
    }

    return random_multi(rng, color_restricted);
}

function three_secondary(rng: seedrandom.PRNG, first_power: PowersRow, second_power: PowersRow): [PowersRow, PowersRow, PowersRow] 
{
    let secondary_1_table = powers_table
        .filter(r => r.Kind == SECONDARY)
        .filter(r=> r.Tag == first_power.Tag || r.Tag == second_power.Tag)
        .filter(r=> not_duplicate(r, [first_power, second_power]));
        
    let secondary_1 = random_multi(rng, secondary_1_table);
    let secondary_2_table = secondary_1_table.filter(r=> not_duplicate(r, [secondary_1]));
    let secondary_2 = random_multi(rng, secondary_2_table)
    let secondary_3_table = secondary_2_table.filter(r=> not_duplicate(r, [secondary_2]));
    let secondary_3 = random_multi(rng, secondary_3_table);
    return [secondary_1, secondary_2, secondary_3]
}