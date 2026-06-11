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

export function random_single(rng: seedrandom.PRNG, data:string[]) : string 
{
    let len = data.length;
    if (len == 0) { throw Error("No Data"); }
    let index = Math.floor(rng() * len);
    return data[index];
}

export function random_multi(rng: seedrandom.PRNG, data:string[][]) : string[]
{
    let len = data.length;
    if (len == 0) { throw Error("No Data"); }
    let index = Math.floor(rng() * len);
    return data[index];
}