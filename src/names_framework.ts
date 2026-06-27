import { random_multi } from "./framework";
import type { NamesRow } from "./table_data/names";
import rawNames from "./table_data/names.json";
import seedrandom from "seedrandom";

const names: NamesRow[] = rawNames;

const SURNAME = "Surname"

export function full_name(rng: seedrandom.PRNG, gender: string, group: string): [string, string] 
{
    let filtered_group = names.filter(r => r.Group == group);
    let gendered_first = filtered_group.filter(r => r.Type == gender);
    let surnames = filtered_group.filter(r => r.Type == SURNAME);
    let first = random_multi(rng, gendered_first).Name;
    let surname = random_multi(rng, surnames).Name;
    return [first, surname];
} 