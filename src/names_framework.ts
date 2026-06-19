import { random_multi } from "./framework";
import names from "./table_data/names.json";
import seedrandom from "seedrandom";

const NAME_INDEX = 0;
const TYPE_INDEX = 1;
const GROUP_INDEX = 2;

const SURNAME = "Surname"
type GENDER = "Male" | "Female";

export function full_name(rng: seedrandom.PRNG, gender: GENDER, group: string): [string, string] 
{
    let filtered_group = names.table.rows.filter(r => r[GROUP_INDEX] == group);
    let gendered_first = filtered_group.filter(r => r[TYPE_INDEX] == gender);
    let surnames = filtered_group.filter(r => r[TYPE_INDEX] == SURNAME);
    let first = random_multi(rng, gendered_first)[NAME_INDEX];
    let surname = random_multi(rng, surnames)[NAME_INDEX];
    return [first, surname];
} 