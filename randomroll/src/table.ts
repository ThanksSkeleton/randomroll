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

export function random_single(rng: seedrandom.PRNG, table:SingletonTable) : string 
{
    let len = table.table.entries.length;
    let index = Math.floor(rng() * len);
    return table.table.entries[index];
}

export function random_multi(rng: seedrandom.PRNG, table:MultiColumnTable) : string[] 
{
    let len = table.table.rows.length;
    let index = Math.floor(rng() * len);
    return table.table.rows[index];
}