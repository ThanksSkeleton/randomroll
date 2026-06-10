import seedrandom from "seedrandom";

export type SingletonTable = {
  version: string;
  name: string;
  label?: string;
  table: {
    entries: string[];
  };
};

export type MultiColumnTable = {
  version: string;
  name: string;
  label?: string;
  table: {
    columns: string[];
    rows: string[][];
  };
};

export const IncludeExclude = {
    Include: "INCLUDE",
    Exclude: "EXCLUDE"
}

export type IncludeExclude = typeof IncludeExclude[keyof typeof IncludeExclude]; 

export type EntryFilter = {
    include_exclude: IncludeExclude,
    column_index: number;
    filter: string;
}

export function random_single(rng: seedrandom.PRNG, table:SingletonTable) : string 
{
    let len = table.table.entries.length;
    let index = Math.floor(rng() * len);
    return table.table.entries[index];
}

export function random_multi(rng: seedrandom.PRNG, table:MultiColumnTable) : string[] 
{
    return random_multi_filter(rng, table, []);
}

// filter: include/exclude (t/f), row index, string contains
export function random_multi_filter(rng: seedrandom.PRNG, table:MultiColumnTable, filters: EntryFilter[]): string[]
{
    let filtered = table.table.rows.filter(r => filters.every(f => filter_match(r, f)));
    let len = filtered.length;
    if (len == 0) {
        throw new Error("Everything Filtered")
    }
    let index = Math.floor(rng() * len);
    return filtered[index];
}

function filter_match(data: string[], filter: EntryFilter) : boolean
{
    if (filter.include_exclude == IncludeExclude.Include) {
        return data[filter.column_index].includes(filter.filter)
    } else {
        return !data[filter.column_index].includes(filter.filter)
    }
}
